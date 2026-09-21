#!/usr/bin/env node
/**
 * The random program generator's command line.
 *
 *   node scripts/fuzz.ts fast [--seed N] [--count N] [--cases N]
 *   node scripts/fuzz.ts full [--seed N] [--count N] [--cases N] [--targets ts,python,go,rust]
 *
 * `fast` compiles each generated program and checks the reference interpreter's actual answers
 * against the range, length and character class the checker proved for them — no code generation,
 * so it is cheap enough to run in the thousands on every `verify` (see `../docs/fuzzing.md`).
 *
 * `full` additionally generates all four targets, in both idiom modes, and compares every answer
 * against the interpreter's, reusing `src/conformance/differential.ts` exactly as
 * `core/conformance/run.ts` does by hand. It is slow (four toolchains, twice each) and is meant to
 * be run deliberately, not on every commit.
 *
 * Either mode exits non-zero when it finds a divergence, and prints the seed plus the shrunken
 * source so the failure can be replayed with `--seed <printed seed> --count 1`.
 */

import { runFast, runFull, shrinkViolation } from "../src/fuzz/harness.ts";

function flag(name: string, fallback: string): string {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

/** JSON cannot carry a bigint on its own; this is only for printing a reproducing input. */
function jsonish(value: unknown): unknown {
	if (typeof value === "bigint") return value.toString();
	if (Array.isArray(value)) return value.map(jsonish);
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, jsonish(v)]));
	}
	return value;
}

function main(): void {
	const mode = process.argv[2];
	const seed = Number(flag("seed", `${Date.now() >>> 0}`));
	const count = Number(flag("count", "500"));
	const cases = Number(flag("cases", mode === "full" ? "4" : "8"));

	if (mode === "fast") {
		process.stdout.write(`fast mode: seed=${seed} count=${count} cases/program=${cases}\n`);
		let lastReported = 0;
		const report = runFast(seed, count, cases, (attempted) => {
			if (attempted - lastReported >= 500) {
				process.stdout.write(`  ${attempted}/${count}…\n`);
				lastReported = attempted;
			}
		});
		process.stdout.write(
			`attempted ${report.attempted}, compiled ${report.compiled} ` +
				`(${((report.compiled / report.attempted) * 100).toFixed(1)}%), ` +
				`ran ${report.casesRun} cases in ${(report.elapsedMs / 1000).toFixed(1)}s\n`,
		);
		if (report.violations.length === 0) {
			process.stdout.write("ok: every produced value stayed inside its proven bounds\n");
			return;
		}
		process.stderr.write(`\n${report.violations.length} bounds violation(s) found — shrinking…\n\n`);
		for (const violation of report.violations) {
			const shrunk = shrinkViolation(violation, cases);
			process.stderr.write(`seed ${seed} (program #${violation.index}, replay: --seed ${seed} --count 1):\n`);
			process.stderr.write(`${shrunk.source}\n`);
			process.stderr.write(`input: ${JSON.stringify(shrunk.input.map(jsonish))}\n`);
			process.stderr.write(
				`the interpreter produced ${JSON.stringify(jsonish(violation.produced))}, which is not a ` +
					`${violation.retType} the checker's proven bound admits\n\n`,
			);
		}
		process.exitCode = 1;
		return;
	}

	if (mode === "full") {
		const targetsFlag = flag("targets", "typescript,python,go,rust");
		const targets = targetsFlag.split(",").map((t) => t.trim()) as ("typescript" | "python" | "go" | "rust")[];
		process.stdout.write(
			`full mode: seed=${seed} count=${count} cases/program=${cases} targets=${targets.join(",")}\n`,
		);
		let lastReported = 0;
		const report = runFull(seed, count, cases, targets, (attempted) => {
			if (attempted - lastReported >= 100) {
				process.stdout.write(`  prefilter ${attempted}/${count}…\n`);
				lastReported = attempted;
			}
		});
		process.stdout.write(
			`attempted ${report.attempted}, compiled ${report.compiled} ` +
				`(${((report.compiled / report.attempted) * 100).toFixed(1)}%), ` +
				`${(report.elapsedMs / 1000).toFixed(1)}s\n`,
		);
		if (report.divergences.length === 0) {
			process.stdout.write("ok: interpreter and every target agree, in both idiom modes\n");
			return;
		}
		process.stderr.write(`\n${report.divergences.length} divergence(s) found\n\n`);
		for (const divergence of report.divergences) {
			process.stderr.write(`seed ${seed}, target ${divergence.target}, case fn=${divergence.case.fn}:\n`);
			process.stderr.write(`${divergence.source}\n`);
			process.stderr.write(`args: ${JSON.stringify(divergence.case.args.map(jsonish))}\n`);
			process.stderr.write(`expected: ${JSON.stringify(divergence.expected)}\n`);
			process.stderr.write(`actual:   ${JSON.stringify(divergence.actual)}\n\n`);
		}
		process.exitCode = 1;
		return;
	}

	process.stderr.write("usage: node scripts/fuzz.ts fast|full [--seed N] [--count N] [--cases N]\n");
	process.exitCode = 1;
}

main();
