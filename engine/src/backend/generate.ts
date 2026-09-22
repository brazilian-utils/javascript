/**
 * Generation: Target AST to files on disk.
 *
 * Everything here is target-independent. A backend contributes a spec (naming, passes), a printer
 * and its support module; this module decides the file layout, the imports between generated
 * modules, the provenance header, and the three review artifacts every target produces:
 * `LOWERING.md`, `API.json` and `SOURCEMAP.json`.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { CExpr, CProgram, CStmt } from "../core/ir.ts";
import type { SemType } from "../types.ts";
import { typeToString } from "../types.ts";
import { lowerProgram } from "./lower.ts";
import type { LowerOptions, TargetSpec } from "./lower.ts";
import type { TExpr, TFunc, TImport, TModule } from "./tast.ts";
import { inlineCalls } from "../optimize/inline.ts";
import type { InlineBudget } from "../optimize/inline.ts";
import { optimize } from "../optimize/optimize.ts";
import { foldTarget } from "./fold.ts";

export const ENGINE_VERSION = "0.1.0";

export type Backend = {
	readonly spec: TargetSpec;
	readonly fileExtension: string;
	/** Renders a module. Imports have already been computed. */
	readonly printModule: (module: TModule) => string;
	/**
	 * Extra `LowerOptions` this backend needs computed from the whole program, merged in before
	 * `lowerProgram` runs. This is how the Rust backend hands its whole-program borrow pre-pass
	 * (`analysis/borrows.ts`) to the shared lowerer without `generate` — target-independent by
	 * design — branching on which target it is building: every other backend simply has none.
	 */
	readonly extraLowerOptions?: (program: CProgram) => Partial<LowerOptions>;
	/** How module `from` refers to module `to` in an import. */
	readonly importPath: (from: string, to: string) => string;
	/** The generated capability and concurrency support, when the program needs it. */
	readonly support?: (program: CProgram, needs: SupportNeeds) => { path: string; text: string } | undefined;
	/** The generated declarations of the project's domain errors. */
	readonly errorsModule?: (program: CProgram) => { path: string; text: string } | undefined;
	/** A type rendered in `API.json`, so DX authors see the real signature. */
	readonly renderType: (type: SemType) => string;
	/** What a module imports from the target's support file, when it needs one. */
	readonly supportImport?: (
		needs: SupportNeeds,
		usesEnv: boolean,
		builtins: readonly string[],
	) => readonly { from: string; names: readonly string[]; typeOnly?: boolean }[];
	/** Line comment marker, used for the provenance header. */
	readonly comment?: string;
	/**
	 * A program that reads `{"fn": …, "args": […]}` lines and answers `{"ok": …}` lines, so the
	 * differential harness can drive every target through one protocol.
	 */
	readonly driver?: (program: CProgram, entryPoints: readonly DriverEntry[]) => { path: string; text: string }[];
	/**
	 * How this target reaches its own platform default capabilities, present only when it has one
	 * to reach. TypeScript and Python do; Go and Rust ship no concrete implementation in the
	 * generated core at all — see `docs/decisions/0011-public-entry-points-vs-capabilities.md`.
	 * When set, `generate` gives every capability-taking entry point a public wrapper under the
	 * source's own name and no capability parameter, moving the capability-taking implementation
	 * to an internal seam this expression feeds by default. Absent, the capability-taking form
	 * stays the only entry point, marked in `API.json` rather than hidden behind a fake.
	 */
	readonly defaultCapabilities?: {
		/**
		 * A bare reference to a module-level singleton, built once at load time — never a call
		 * repeated per invocation, which is the whole point of building it once.
		 */
		readonly ref: TExpr;
		/** What a module with a wrapper needs to import to see `ref`. */
		readonly imports: readonly { from: string; names: readonly string[] }[];
		/** The seam's own name, derived from the public wrapper's name it stands in for. */
		readonly seamName: (publicName: string) => string;
	};
	/**
	 * How aggressively this target's own call-site inlining (`optimize/inline.ts`) should run,
	 * absent when the target's own compiler already does this job — see that module's header for
	 * why the budget is per target rather than a single number for every backend.
	 */
	readonly inlineBudget?: InlineBudget;
};

/** One entry point, as the generated driver sees it. */
export type DriverEntry = {
	readonly coreName: string;
	readonly targetName: string;
	readonly modulePath: string;
	readonly params: readonly SemType[];
	readonly ret: SemType;
	readonly usesEnv: boolean;
	readonly fails: readonly string[];
};

export type SupportNeeds = {
	readonly env: boolean;
	readonly race: boolean;
};

export type GenerateResult = {
	readonly files: readonly { readonly path: string; readonly text: string }[];
	readonly lowering: string;
	/** Every selection the lowering table made, for the metrics. */
	readonly selections: readonly { op: string; args: string; impl: string; reason: string }[];
	readonly api: unknown;
	readonly sourceMap: unknown;
};

export function generate(
	program: CProgram,
	backend: Backend,
	options: LowerOptions = {},
): GenerateResult {
	// Inlining substitutes a call site's own arguments into the callee's body, so it exposes
	// constants the folder could not see the first time it ran: a helper that takes a month and
	// asks whether it is February, called with `3`, becomes `3 === 2` — dead, but only once the
	// argument is in place. Re-running the Core-to-Core passes afterwards is what turns that into
	// the branch a person would have written. They are the same passes, proven against the
	// reference interpreter by `tests/translation.spec.ts`, and running them twice is idempotent
	// where there is nothing new to find.
	const inlined =
		backend.inlineBudget === undefined ? program : optimize(inlineCalls(program, backend.inlineBudget));
	const lowered = lowerProgram(inlined, backend.spec, { ...options, ...backend.extraLowerOptions?.(inlined) });
	const moduleOf = new Map<string, string>();
	for (const fn of inlined.functions.values()) moduleOf.set(fn.name, fn.module);

	// After lowering, because a lowering is code generation too: the shape it expands an argument
	// into only collapses once that argument is a constant, which inlining is what makes it. See
	// `fold.ts` for what this is allowed to fold and why one pass serves all four targets.
	const modules = splitCapabilityEntryPoints(lowered.modules, backend).map((module) => ({
		...module,
		functions: module.functions.map((fn) => ({ ...fn, body: foldTarget(fn.body) })),
	}));

	const files: { path: string; text: string }[] = [];
	const sourceMap: Record<string, { module: string; start: number; end: number }> = {};
	const api: {
		functions: { name: string; module: string; params: { name: string; type: string }[]; returns: string; effects: string[] }[];
		// A capability-taking form: either an entry point's internal seam (its public wrapper is
		// listed in `functions` instead) or, absent a wrapper, the same entry as `functions` lists,
		// repeated here so a reader sees it needs capabilities without inferring that from `effects`.
		seams: {
			name: string;
			publicName: string;
			module: string;
			params: { name: string; type: string }[];
			returns: string;
			hasWrapper: boolean;
		}[];
		records: { name: string; fields: { name: string; type: string }[] }[];
		errors: string[];
	} = { functions: [], seams: [], records: [], errors: [] };

	const needs: SupportNeeds = {
		env: [...inlined.functions.values()].some((fn) => fn.usesEnv),
		race: [...inlined.functions.values()].some((fn) => usesOp(fn.body, "task.race")),
	};

	for (const module of modules) {
		const sourcePath = module.sourcePath;
		const imports = computeImports(
			module,
			sourcePath,
			inlined,
			lowered.functionNames,
			moduleOf,
			backend,
			needs,
			lowered.moduleNeeds.get(sourcePath) ?? new Set(),
			[...(lowered.moduleBuiltins.get(sourcePath) ?? new Set<string>())].sort(),
		);
		const hasWrapper = module.functions.some((fn) => fn.seamName !== undefined);
		if (hasWrapper && backend.defaultCapabilities !== undefined) {
			for (const item of backend.defaultCapabilities.imports) {
				// Folded into an existing import from the same place, typed the same way, rather than
				// a second statement — `supportImport` already returns one untyped import per source
				// for a target that only ever needs one, and this keeps that target at just the one.
				const index = imports.findIndex(
					(candidate) => candidate.from === item.from && candidate.typeOnly !== true,
				);
				if (index === -1) {
					imports.push({ from: item.from, names: [...item.names] });
				} else {
					const merged = [...new Set([...imports[index]!.names, ...item.names])].sort();
					imports[index] = { ...imports[index]!, names: merged };
				}
			}
		}
		const printed = backend.printModule({
			...module,
			imports,
			header: header(sourcePath, program, backend.comment ?? "//"),
		});
		files.push({ path: module.path, text: printed });

		for (const fn of module.functions) {
			sourceMap[`${module.path}#${fn.name}`] = {
				module: fn.source.module,
				start: fn.source.start,
				end: fn.source.end,
			};
			if (fn.exported) {
				api.functions.push({
					name: fn.name,
					module: module.path,
					params: fn.params.map((param) => ({ name: param.name, type: backend.renderType(param.type) })),
					returns: backend.renderType(fn.ret),
					effects: fn.fails.map((name) => `Fail<${name}>`).concat(fn.usesEnv ? ["env"] : []),
				});
			}
			if (fn.seam === true) {
				api.seams.push({
					name: fn.name,
					publicName: fn.wrapperName ?? fn.name, // no wrapper: it is its own public name
					module: module.path,
					params: fn.params.map((param) => ({ name: param.name, type: backend.renderType(param.type) })),
					returns: backend.renderType(fn.ret),
					hasWrapper: fn.wrapperName !== undefined,
				});
			}
		}
		for (const record of module.records) {
			if (api.records.some((item) => item.name === record.name)) continue;
			api.records.push({
				name: record.name,
				fields: record.fields.map((field) => ({ name: field.name, type: backend.renderType(field.type) })),
			});
		}
	}

	const entries: DriverEntry[] = [];
	for (const module of modules) {
		for (const fn of module.functions) {
			// The wrapper itself never drives: it has no capability parameter to inject a fake
			// through, so the differential harness always targets its seam instead (below).
			if (fn.seamName !== undefined) continue;
			if (!fn.exported && fn.seam !== true) continue;
			entries.push({
				coreName: `${module.sourcePath}::${fn.source.name}`,
				targetName: fn.name,
				modulePath: module.path,
				params: fn.params.filter((param) => param.name !== "env").map((param) => param.type),
				ret: fn.ret,
				usesEnv: fn.usesEnv,
				fails: fn.fails,
			});
		}
	}
	for (const file of backend.driver?.(program, entries) ?? []) files.push(file);

	const errors = backend.errorsModule?.(program);
	if (errors !== undefined) files.push(errors);
	const support = backend.support?.(program, needs);
	if (support !== undefined) files.push(support);
	api.errors = [...program.errors.keys()].sort();

	return {
		files,
		lowering: lowered.table.renderLoweringDoc(backend.spec.name),
		selections: lowered.table.selections,
		api,
		sourceMap,
	};
}

/**
 * Defect 1's fix (`docs/decisions/0011-public-entry-points-vs-capabilities.md`): capability
 * threading gives an entry point an `env` parameter the moment it or something it calls reaches
 * Http, Clock or Random, but the source never declared that parameter, so it cannot stay on the
 * function a caller imports under the entry point's own name. Where the target can build a
 * default (`backend.defaultCapabilities`), this splits such an entry point in two: a public
 * wrapper that keeps the source's exact signature and calls an internal seam — named so it reads
 * as one — that still takes capabilities and defaults to the platform's own. The seam is what the
 * differential driver calls directly, to inject fakes (`entries`, below). Where the target cannot
 * (Go, Rust — see the module comment on `defaultCapabilities`), the function is left as is, only
 * marked (`seam: true`) so `API.json` documents it as capability-taking rather than an ordinary
 * utility.
 */
function splitCapabilityEntryPoints(modules: readonly TModule[], backend: Backend): TModule[] {
	const defaults = backend.defaultCapabilities;
	return modules.map((module) => {
		let changed = false;
		const functions = module.functions.flatMap((fn): TFunc[] => {
			if (!fn.exported || !fn.usesEnv) return [fn];
			changed = true;
			if (defaults === undefined) return [{ ...fn, seam: true }];

			const seamName = defaults.seamName(fn.name);
			const publicParams = fn.params.filter((param) => param.name !== "env");
			const wrapper: TFunc = {
				name: fn.name,
				params: publicParams,
				ret: fn.ret,
				body: [
					{
						kind: "return",
						value: {
							kind: "call",
							callee: { kind: "name", name: seamName },
							args: [...publicParams.map((param): TExpr => ({ kind: "name", name: param.name })), defaults.ref],
							await: fn.isAsync,
						},
					},
				],
				exported: true,
				moduleExported: true,
				doc: fn.doc,
				isAsync: fn.isAsync,
				fails: fn.fails,
				usesEnv: false,
				seamName,
				source: fn.source,
			};
			// The seam carries its own short note rather than a copy of the utility's documentation:
			// a reader who reaches it is looking for why it exists, and the utility's own prose is
			// already right above it on the wrapper.
			const seamNote =
				`\`${fn.name}\`, taking its capabilities explicitly.\n\n` +
				`The public \`${fn.name}\` calls this with the platform's defaults. Pass your own to\n` +
				"supply a clock, a source of randomness or an HTTP client — which is what the\n" +
				"differential conformance driver does to make a run reproducible.";
			const seam: TFunc = {
				...fn,
				name: seamName,
				exported: false,
				moduleExported: true,
				seam: true,
				wrapperName: fn.name,
				doc: seamNote,
			};
			return [wrapper, seam];
		});
		return changed ? { ...module, functions } : module;
	});
}

/** Whether a Core body mentions an operation, used to decide what support code is needed. */
function usesOp(body: readonly CStmt[], op: string): boolean {
	let found = false;
	const expr = (node: CExpr): void => {
		if (found) return;
		switch (node.kind) {
			case "op":
				if (node.op === op) found = true;
				node.args.forEach(expr);
				return;
			case "call":
				node.args.forEach(expr);
				return;
			case "record":
				node.fields.forEach((field) => expr(field.value));
				return;
			case "list":
				node.items.forEach(expr);
				return;
			case "field":
				expr(node.target);
				return;
			case "some":
				expr(node.inner);
				return;
			case "cond":
				expr(node.test);
				expr(node.then);
				expr(node.otherwise);
				return;
			case "and":
			case "or":
				expr(node.left);
				expr(node.right);
				return;
			case "not":
				expr(node.operand);
				return;
			case "lambda":
				node.body.forEach(statement);
				return;
			default:
				return;
		}
	};
	const statement = (node: CStmt): void => {
		switch (node.kind) {
			case "let":
				expr(node.init);
				return;
			case "assign":
			case "push":
				expr(node.value);
				return;
			case "setIndex":
				expr(node.index);
				expr(node.value);
				return;
			case "if":
				expr(node.test);
				node.then.forEach(statement);
				node.otherwise.forEach(statement);
				return;
			case "switch":
				expr(node.subject);
				node.cases.forEach((entry) => entry.body.forEach(statement));
				node.otherwise?.forEach(statement);
				return;
			case "forRange":
				expr(node.from);
				expr(node.to);
				node.body.forEach(statement);
				return;
			case "forEach":
				expr(node.iterable);
				node.body.forEach(statement);
				return;
			case "return":
				if (node.value !== undefined) expr(node.value);
				return;
			case "fail":
				node.args.forEach(expr);
				return;
			case "expr":
				expr(node.expr);
				return;
			default:
				return;
		}
	};
	body.forEach(statement);
	return found;
}

function header(modulePath: string, program: CProgram, comment: string): string {
	const hash = createHash("sha256")
		.update(
			[...program.functions.values()]
				.filter((fn) => fn.module === modulePath)
				.map((fn) => fn.name)
				.sort()
				.join(","),
		)
		.digest("hex")
		.slice(0, 12);
	return [
		`${comment} Code generated by the logic engine. DO NOT EDIT.`,
		`${comment} engine: ${ENGINE_VERSION}`,
		`${comment} source: ${modulePath}`,
		`${comment} content: ${hash}`,
	].join("\n");
}

function computeImports(
	module: TModule,
	sourcePath: string,
	program: CProgram,
	names: ReadonlyMap<string, string>,
	moduleOf: ReadonlyMap<string, string>,
	backend: Backend,
	needs: SupportNeeds,
	portable: ReadonlySet<string>,
	builtins: readonly string[],
): TImport[] {
	const byModule = new Map<string, Set<string>>();
	const record = (callee: string): void => {
		const target = moduleOf.get(callee);
		if (target === undefined || target === sourcePath) return;
		const name = names.get(callee);
		if (name === undefined) return;
		const set = byModule.get(target);
		if (set === undefined) byModule.set(target, new Set([name]));
		else set.add(name);
	};
	for (const callee of portable) record(callee);
	for (const fn of program.functions.values()) {
		if (fn.module !== sourcePath) continue;
		for (const callee of fn.calls) {
			record(callee);
		}
	}
	const imports: TImport[] = [...byModule.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([target, used]) => ({
			from: backend.importPath(sourcePath, target),
			names: [...used].sort(),
		}));

	const localErrors = [...program.errors.values()].filter((error) => !error.exported || true);
	const usesErrors = module.functions.some((fn) => fn.fails.length > 0);
	if (usesErrors && localErrors.length > 0) {
		imports.push({
			from: backend.importPath(sourcePath, "errors"),
			names: [...new Set(module.functions.flatMap((fn) => fn.fails))].sort(),
		});
	}
	const usesEnv = module.functions.some((fn) => fn.usesEnv);
	for (const support of backend.supportImport?.(needs, usesEnv, builtins) ?? []) {
		if (support.names.length > 0) {
			imports.push({ from: support.from, names: [...support.names], typeOnly: support.typeOnly });
		}
	}
	return imports;
}

/** Directories that belong to the target's own toolchain, never to this engine. */
const FOREIGN_DIRECTORIES = new Set(["target", "__pycache__", "node_modules", ".git"]);

/**
 * Removes generated files this run did not produce.
 *
 * A module stops being generated whenever the program stops needing it — inlining a helper into
 * its only caller drops the whole file from the dependency closure — and a leftover from an
 * earlier run is not inert: every later step reads the directory rather than the result, so a
 * stale file is typechecked, benchmarked, measured and committed as though it were output. It is
 * identified by this engine's own header and by nothing else, so a fixture, a lockfile or a
 * toolchain's build directory sitting beside the output is never touched.
 */
function removeStaleFiles(outDir: string, written: ReadonlySet<string>): void {
	if (!existsSync(outDir)) return;
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory)) {
			const full = join(directory, entry);
			if (statSync(full).isDirectory()) {
				if (!FOREIGN_DIRECTORIES.has(entry)) walk(full);
				continue;
			}
			if (written.has(relative(outDir, full))) continue;
			let head: string;
			try {
				head = readFileSync(full, "utf8").slice(0, 200);
			} catch {
				continue;
			}
			if (head.includes("Code generated by the logic engine")) rmSync(full);
		}
	};
	walk(outDir);
}

export function writeFiles(outDir: string, result: GenerateResult, extras: Record<string, string>): void {
	const written = new Set<string>();
	for (const file of [...result.files]) {
		const full = join(outDir, file.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, file.text);
		written.add(relative(outDir, full));
	}
	for (const [name, text] of Object.entries(extras)) {
		const full = join(outDir, name);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, text);
		written.add(relative(outDir, full));
	}
	removeStaleFiles(outDir, written);
}

export { relative, typeToString };
