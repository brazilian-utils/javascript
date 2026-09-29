#!/usr/bin/env node

/**
 * Removes from Stryker's incremental report every saved result that a change can have made
 * stale, so that `stryker run --incremental` tests those mutants again:
 *
 * - every mutant of a mutated file that changed, or that imports (directly or through other
 *   files) a file that changed;
 * - every other mutant whose result came from a test in a test file that imports (directly or
 *   through other files) a file that changed: the test that killed a killed mutant, or any
 *   covering test of a mutant with another status.
 *
 * Stryker reuses a mutant's result when the mutant's own code and the source of its covering
 * tests did not change, and looks at nothing else. A change to `_internals/format` would keep
 * every `format*` mutant's old result (the first case), and a change to `format-cpf` that stops
 * calling a helper would keep that helper's mutants "killed" by the `format-cpf` tests (the
 * second). A mutant missing from the report is a new one to Stryker. A killed mutant whose
 * killing test reaches no changed file is still killed, so the tests that only cover it (like
 * `index.test.ts`, which imports every module) do not send it back. The previous source of
 * every file is in the report itself, so no git history is needed. Constants, test helpers,
 * dependencies and the config are not mutated and are covered by the cache key in the
 * `Mutation tests` workflow.
 *
 * Usage:
 *   node scripts/prune-stryker-incremental.ts
 *     Rewrite `reports/stryker-incremental.json` (or the config's `incrementalFile`) in place.
 *     Does nothing when the file does not exist.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, matchesGlob, relative, resolve } from "node:path";

const ROOT = join(import.meta.dirname, "..");

type StrykerConfig = { mutate: string[]; incrementalFile?: string };
type Mutant = { status: string; killedBy?: string[]; coveredBy?: string[] };
type IncrementalReport = {
	files: Record<string, { source: string; mutants: Mutant[] }>;
	testFiles?: Record<string, { tests: { id: string }[] }>;
};

const isStrykerConfig = (value: unknown): value is StrykerConfig =>
	typeof value === "object" &&
	value !== null &&
	"mutate" in value &&
	Array.isArray(value.mutate) &&
	value.mutate.every((pattern) => typeof pattern === "string") &&
	(!("incrementalFile" in value) || typeof value.incrementalFile === "string");

const isIncrementalReport = (value: unknown): value is IncrementalReport =>
	typeof value === "object" &&
	value !== null &&
	"files" in value &&
	typeof value.files === "object" &&
	value.files !== null &&
	Object.entries(value.files).every(
		([, file]: [string, unknown]) =>
			typeof file === "object" &&
			file !== null &&
			"source" in file &&
			typeof file.source === "string" &&
			"mutants" in file &&
			Array.isArray(file.mutants) &&
			file.mutants.every(
				(mutant: unknown) =>
					typeof mutant === "object" &&
					mutant !== null &&
					"status" in mutant &&
					typeof mutant.status === "string",
			),
	) &&
	(!("testFiles" in value) ||
		(typeof value.testFiles === "object" &&
			value.testFiles !== null &&
			Object.entries(value.testFiles).every(
				([, file]: [string, unknown]) =>
					typeof file === "object" && file !== null && "tests" in file && Array.isArray(file.tests),
			)));

const parsedConfig: unknown = JSON.parse(readFileSync(join(ROOT, "stryker.config.json"), "utf8"));
if (!isStrykerConfig(parsedConfig)) throw new Error("stryker.config.json has no mutate patterns");
const config = parsedConfig;
const reportPath = join(ROOT, config.incrementalFile ?? "reports/stryker-incremental.json");

/**
 * Whether Stryker mutates the file, by the `mutate` patterns of the config (a `!` pattern
 * excludes).
 * @param {string} file - The path relative to the repository root, with `/` separators.
 * @returns {boolean} `true` when the file is mutated.
 */
function isMutated(file: string): boolean {
	const included = config.mutate.filter((pattern) => !pattern.startsWith("!"));
	const excluded = config.mutate
		.filter((pattern) => pattern.startsWith("!"))
		.map((pattern) => pattern.slice(1));
	return (
		included.some((pattern) => matchesGlob(file, pattern)) &&
		!excluded.some((pattern) => matchesGlob(file, pattern))
	);
}

/**
 * Resolves a relative import specifier the way the source is written: without an extension,
 * pointing at a `.ts` file or at a directory's `index.ts`.
 * @param {string} importer - The importing file, relative to the repository root.
 * @param {string} specifier - The specifier as written in the import.
 * @returns {string | undefined} The imported file relative to the repository root, or
 * `undefined` for a package import or a path that does not exist.
 */
function resolveImport(importer: string, specifier: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined;
	const base = join(dirname(importer), specifier);
	const candidates = [base, `${base}.ts`, join(base, "index.ts")];
	return candidates.find(
		(candidate) => candidate.endsWith(".ts") && existsSync(join(ROOT, candidate)),
	);
}

/**
 * Lists, for every source file, the files that import it.
 * @param {string[]} files - Every `.ts` file under `src`, relative to the repository root.
 * @returns {Map<string, Set<string>>} The importers of each imported file.
 */
function collectImporters(files: string[]): Map<string, Set<string>> {
	const importers = new Map<string, Set<string>>();
	const specifierPattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;
	for (const file of files) {
		const source = readFileSync(join(ROOT, file), "utf8");
		for (const [, specifier] of source.matchAll(specifierPattern)) {
			const imported = resolveImport(file, specifier);
			if (imported === undefined) continue;
			const set = importers.get(imported) ?? new Set<string>();
			set.add(file);
			importers.set(imported, set);
		}
	}
	return importers;
}

if (!existsSync(reportPath)) {
	console.log(`No incremental report at ${relative(ROOT, reportPath)}, nothing to prune.`);
	process.exit(0);
}

const parsedReport: unknown = JSON.parse(readFileSync(reportPath, "utf8"));
if (!isIncrementalReport(parsedReport))
	throw new Error(`${relative(ROOT, reportPath)} is not a Stryker report`);
const report = parsedReport;
const toRelative = (file: string): string =>
	(isAbsolute(file) ? relative(ROOT, file) : relative(ROOT, resolve(ROOT, file)))
		.split("\\")
		.join("/");
const previousSources = new Map(
	Object.entries(report.files).map(([file, { source }]) => [toRelative(file), source]),
);

const sourceFiles = readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" })
	.map((file) => `src/${file.split("\\").join("/")}`)
	.filter((file) => file.endsWith(".ts"));

// A mutated file is changed when its source differs from the report's, or when the report does
// not have it (a new file).
const changed = sourceFiles.filter(
	(file) => isMutated(file) && previousSources.get(file) !== readFileSync(join(ROOT, file), "utf8"),
);

const importers = collectImporters(sourceFiles);
const stale = new Set(changed);
const queue = [...changed];
for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
	for (const importer of importers.get(file) ?? []) {
		if (stale.has(importer)) continue;
		stale.add(importer);
		queue.push(importer);
	}
}

// The tests of every test file that `stale` reached: their source did not change, but what they
// call did.
const staleTests = new Set(
	Object.entries(report.testFiles ?? {})
		.filter(([file]) => stale.has(toRelative(file)))
		.flatMap(([, { tests }]) => tests.map(({ id }) => id)),
);
const isStaleResult = (mutant: Mutant): boolean =>
	(mutant.status === "Killed" ? (mutant.killedBy ?? []) : (mutant.coveredBy ?? [])).some((id) =>
		staleTests.has(id),
	);

let droppedFiles = 0;
let droppedMutants = 0;
for (const [file, entry] of Object.entries(report.files)) {
	if (stale.has(toRelative(file))) {
		droppedFiles += 1;
		droppedMutants += entry.mutants.length;
		delete report.files[file];
		continue;
	}
	const kept = entry.mutants.filter((mutant) => !isStaleResult(mutant));
	droppedMutants += entry.mutants.length - kept.length;
	entry.mutants = kept;
}
writeFileSync(reportPath, JSON.stringify(report));

console.log(
	`${changed.length} mutated file(s) changed, ${staleTests.size} test(s) reach a change; dropped ${droppedMutants} mutant result(s), ${droppedFiles} whole file(s), from ${relative(ROOT, reportPath)}.`,
);
