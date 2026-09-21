/**
 * Fast and full differential runs over generated programs.
 *
 * Fast mode needs no code generation at all: it compiles a generated program, runs the reference
 * interpreter, and checks that every value the interpreter actually produced lies inside the
 * range, length and character class the checker proved for it (`docs/semantics.md` section 10,
 * Layer 1 — see the module doc on `generate.ts` for why this is the highest-value comparison
 * here). Full mode adds all four generated targets, in both idiom modes, reusing the same
 * `runInterpreter`/`runTarget`/`compare` machinery `core/conformance/run.ts` drives by hand.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CompileError, compileProject } from "../api.ts";
import type { Compilation } from "../api.ts";
import { generate, writeFiles } from "../backend/generate.ts";
import { TYPESCRIPT_BACKEND } from "../targets/typescript/index.ts";
import { PYTHON_BACKEND } from "../targets/python/index.ts";
import { GO_BACKEND } from "../targets/go/index.ts";
import { RUST_BACKEND } from "../targets/rust/index.ts";
import { compare, runInterpreter, runTarget } from "../conformance/differential.ts";
import type { Case, Divergence, TargetRunner } from "../conformance/differential.ts";
import { DomainFailure } from "../intrinsics/index.ts";
import { Interpreter } from "../interp/interp.ts";
import type { CFunc } from "../core/ir.ts";
import type { Value } from "../values.ts";
import type { FuzzFunc } from "./ast.ts";
import { printProgram } from "./ast.ts";
import { generateProgram } from "./generate.ts";
import { Rng, subSeed } from "./rng.ts";
import type { Fails } from "./shrink.ts";
import { shrinkInputs, shrinkProgram } from "./shrink.ts";
import { randomValue, withinType } from "./values.ts";

const BACKENDS = {
	typescript: TYPESCRIPT_BACKEND,
	python: PYTHON_BACKEND,
	go: GO_BACKEND,
	rust: RUST_BACKEND,
} as const;

/** A scratch project directory holding exactly one source module, overwritten on every call. */
class Scratch {
	readonly dir: string;
	readonly sourceDir: string;

	constructor() {
		this.dir = mkdtempSync(join(tmpdir(), "logic-engine-fuzz-"));
		this.sourceDir = join(this.dir, "source");
		mkdirSync(this.sourceDir, { recursive: true });
	}

	/** Compiles `source` as `program.ts`, the scratch project's one module. */
	compile(source: string): Compilation | undefined {
		writeFileSync(join(this.sourceDir, "program.ts"), source);
		try {
			return compileProject(this.sourceDir);
		} catch (error) {
			if (error instanceof CompileError) return undefined;
			throw error;
		}
	}

	cleanup(): void {
		rmSync(this.dir, { recursive: true, force: true });
	}
}

export type BoundsViolation = {
	readonly seed: number;
	readonly index: number;
	readonly fnName: string;
	readonly input: readonly Value[];
	readonly produced: unknown;
	readonly retType: string;
};

export type FastReport = {
	readonly seed: number;
	readonly attempted: number;
	readonly compiled: number;
	readonly casesRun: number;
	readonly violations: (BoundsViolation & { readonly source: string })[];
	readonly elapsedMs: number;
};

function qualifiedName(fn: FuzzFunc): string {
	return `program::${fn.fnName}`;
}

/**
 * Calls the reference interpreter directly, keeping its native `Value` representation (a bigint
 * `Int`, a real array `List`, …) rather than the JSON `toJson`/`fromJson` `differential.ts` uses
 * for the cross-target protocol — the whole point of Layer 1 is checking that native value
 * against the checker's own proven type, which needs the exact representation, not JSON's.
 */
function interpretRaw(
	compilation: Compilation,
	name: string,
	args: readonly Value[],
): { ok: true; value: Value } | { ok: false; error: string } {
	try {
		return { ok: true, value: new Interpreter(compilation.program).call(name, args) };
	} catch (error) {
		if (error instanceof DomainFailure) return { ok: false, error: error.errorType };
		throw error;
	}
}

export type ProgressCb = (attempted: number, compiled: number) => void;

export function runFast(
	seed: number,
	count: number,
	casesPerProgram = 8,
	onProgress?: ProgressCb,
): FastReport {
	const start = Date.now();
	const scratch = new Scratch();
	let compiled = 0;
	let casesRun = 0;
	const violations: (BoundsViolation & { source: string })[] = [];
	try {
		for (let i = 0; i < count; i++) {
			const programSeed = subSeed(seed, i);
			const fn = generateProgram(programSeed, { id: String(i) });
			const source = printProgram(fn);
			const compilation = scratch.compile(source);
			if (compilation === undefined) {
				onProgress?.(i + 1, compiled);
				continue;
			}
			compiled += 1;
			const cfunc = compilation.program.functions.get(qualifiedName(fn));
			if (cfunc === undefined) {
				onProgress?.(i + 1, compiled);
				continue;
			}
			const rng = new Rng(subSeed(programSeed, 0xf057));
			for (let c = 0; c < casesPerProgram; c++) {
				const input = cfunc.params.map((p) => randomValue(rng, p.type));
				casesRun += 1;
				const outcome = interpretRaw(compilation, cfunc.name, input);
				if (outcome.ok && !withinType(outcome.value, cfunc.ret)) {
					violations.push({
						seed,
						index: i,
						fnName: fn.fnName,
						input,
						produced: outcome.value,
						retType: cfunc.ret.kind,
						source,
					});
					break;
				}
			}
			onProgress?.(i + 1, compiled);
		}
	} finally {
		scratch.cleanup();
	}
	return { seed, attempted: count, compiled, casesRun, violations, elapsedMs: Date.now() - start };
}

/** Re-shrinks a bounds violation found by `runFast` into the smallest reproducing program. */
export function shrinkViolation(
	violation: BoundsViolation & { source: string },
	casesPerProgram: number,
): { fn: FuzzFunc; source: string; input: readonly Value[] } {
	const scratch = new Scratch();
	try {
		const original = generateProgram(subSeed(violation.seed, violation.index), { id: String(violation.index) });
		const fails: Fails = (candidate) => {
			const compilation = scratch.compile(printProgram(candidate));
			if (compilation === undefined) return { ok: false };
			const cfunc = compilation.program.functions.get(qualifiedName(candidate));
			if (cfunc === undefined) return { ok: false };
			// The original failing input is tried first: most statement removals do not touch the
			// path that produced it, so it usually still reproduces without any extra search.
			for (const input of [violation.input, ...extraInputs(cfunc, violation.seed, casesPerProgram)]) {
				const outcome = interpretRaw(compilation, cfunc.name, input);
				if (outcome.ok && !withinType(outcome.value, cfunc.ret)) return { ok: true, input };
			}
			return { ok: false };
		};
		const { fn: shrunkFn, input } = shrinkProgram(original, fails, 500);
		const finalInput = input ?? violation.input;
		const compilation = scratch.compile(printProgram(shrunkFn))!;
		const cfunc = compilation.program.functions.get(qualifiedName(shrunkFn))!;
		const narrowedInput = shrinkInputs(
			finalInput,
			cfunc.params.map((p) => p.type),
			(candidate) => {
				const outcome = interpretRaw(compilation, cfunc.name, candidate);
				return outcome.ok && !withinType(outcome.value, cfunc.ret);
			},
		);
		return { fn: shrunkFn, source: printProgram(shrunkFn), input: narrowedInput };
	} finally {
		scratch.cleanup();
	}
}

function extraInputs(cfunc: CFunc, seed: number, count: number): readonly (readonly Value[])[] {
	const rng = new Rng(subSeed(seed, 0xbeef));
	return Array.from({ length: count }, () => cfunc.params.map((p) => randomValue(rng, p.type)));
}

/* -------------------------------------------------------------------------------------------- *
 * Full mode: interpreter and all four targets, in both idiom modes.
 * -------------------------------------------------------------------------------------------- */

export type FullReport = {
	readonly seed: number;
	readonly attempted: number;
	readonly compiled: number;
	readonly divergences: (Divergence & { readonly source: string })[];
	readonly elapsedMs: number;
};

function runners(
	outRoot: string,
	suffix: string,
	targets: readonly (keyof typeof BACKENDS)[],
): readonly TargetRunner[] {
	const all: Record<keyof typeof BACKENDS, TargetRunner> = {
		typescript: {
			name: `typescript${suffix}`,
			command: process.execPath,
			args: ["_driver.ts"],
			cwd: resolve(outRoot, `typescript${suffix}`),
		},
		python: { name: `python${suffix}`, command: "python3", args: ["-m", `python${suffix}._driver`], cwd: outRoot },
		go: { name: `go${suffix}`, command: "go", args: ["run", "./cmd/driver"], cwd: resolve(outRoot, `go${suffix}`) },
		rust: {
			name: `rust${suffix}`,
			command: "cargo",
			args: ["run", "--offline", "--release", "--quiet", "--bin", "driver"],
			cwd: resolve(outRoot, `rust${suffix}`),
		},
	};
	return targets.map((target) => all[target]);
}

export function runFull(
	seed: number,
	count: number,
	casesPerProgram = 4,
	targets: readonly (keyof typeof BACKENDS)[] = ["typescript", "python", "go", "rust"],
	onProgress?: ProgressCb,
): FullReport {
	const start = Date.now();
	const prefilter = new Scratch();
	const survivors: { index: number; fn: FuzzFunc; source: string }[] = [];
	try {
		for (let i = 0; i < count; i++) {
			const programSeed = subSeed(seed, i);
			const fn = generateProgram(programSeed, { id: String(i) });
			const source = printProgram(fn);
			if (prefilter.compile(source) !== undefined) survivors.push({ index: i, fn, source });
			onProgress?.(i + 1, survivors.length);
		}
	} finally {
		prefilter.cleanup();
	}

	const batchSource = survivors.map((s) => s.source).join("\n");
	const project = mkdtempSync(join(tmpdir(), "logic-engine-fuzz-full-"));
	const sourceDir = join(project, "source");
	const outRoot = join(project, "out");
	mkdirSync(sourceDir, { recursive: true });
	writeFileSync(join(sourceDir, "program.ts"), batchSource);

	const divergences: (Divergence & { source: string })[] = [];
	try {
		const compilation = compileProject(sourceDir);
		const rng = new Rng(subSeed(seed, 0xfeed));
		const cases: Case[] = [];
		const caseSource = new Map<string, string>();
		for (const { fn, source } of survivors) {
			const cfunc = compilation.program.functions.get(qualifiedName(fn));
			if (cfunc === undefined) continue;
			caseSource.set(cfunc.name, source);
			for (let c = 0; c < casesPerProgram; c++) {
				cases.push({ fn: cfunc.name, args: cfunc.params.map((p) => randomValue(rng, p.type)) });
			}
		}
		if (cases.length === 0) {
			return { seed, attempted: count, compiled: survivors.length, divergences: [], elapsedMs: Date.now() - start };
		}
		const reference = runInterpreter(compilation.program, cases);

		for (const mode of ["idiomatic", "plain"] as const) {
			const suffix = mode === "plain" ? "-plain" : "";
			for (const target of targets) {
				const backend = BACKENDS[target];
				const result = generate(compilation.program, backend, { noIdioms: mode === "plain" });
				const outDir = resolve(outRoot, `${target}${suffix}`);
				writeFiles(outDir, result, {
					"LOWERING.md": result.lowering,
					"API.json": `${JSON.stringify(result.api, null, "\t")}\n`,
					"SOURCEMAP.json": `${JSON.stringify(result.sourceMap, null, "\t")}\n`,
				});
			}
			for (const runner of runners(outRoot, suffix, targets)) {
				let actual;
				try {
					actual = runTarget(runner, cases);
				} catch (error) {
					// A target that fails to build at all is a finding in its own right, reported as a
					// single divergence rather than silently skipped.
					divergences.push({
						target: runner.name,
						case: cases[0]!,
						expected: reference[0]!,
						actual: { ok: false, error: `driver failed to run: ${String(error)}` },
						source: "(build/run failure, not a single program)",
					} as Divergence & { source: string });
					continue;
				}
				const found = compare(reference, actual, cases, runner.name);
				for (const divergence of found) {
					divergences.push({ ...divergence, source: caseSource.get(divergence.case.fn) ?? "(unknown)" });
				}
			}
		}
	} finally {
		rmSync(project, { recursive: true, force: true });
	}

	return { seed, attempted: count, compiled: survivors.length, divergences, elapsedMs: Date.now() - start };
}
