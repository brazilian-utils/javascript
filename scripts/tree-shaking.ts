#!/usr/bin/env node

/**
 * Measures the tree-shaken bundle size of every function this package exports, by building one
 * esbuild single-import consumer per export.
 *
 * Usage:
 *   node scripts/tree-shaking.ts
 *     Measure the local `dist` build and print a table (name, bytes, gzip) plus the full-import
 *     size. Informational, always exits 0.
 *
 *   node scripts/tree-shaking.ts --json <path>
 *     Also write `{ full: {bytes,gzip}, exports: { name: {bytes,gzip} } }` to `<path>`.
 *
 *   node scripts/tree-shaking.ts --compare <base.json>
 *     Diff the current build against a snapshot produced by a previous `--json` run, print a
 *     Markdown report, and fail (exit 1) when a pre-existing export grew by more than
 *     REGRESSION_PERCENT_THRESHOLD and more than REGRESSION_BYTES_THRESHOLD, or when the
 *     bundle importing every export that already existed on the base grew by more than
 *     FULL_IMPORT_PERCENT_THRESHOLD (new exports never count as a regression).
 *
 *   node scripts/tree-shaking.ts --markdown <path>
 *     With `--compare`, also write the Markdown report to `<path>` (for posting as a PR comment).
 *
 *   node scripts/tree-shaking.ts --dist <path>
 *     Measure a package rooted at `<path>` (a directory holding its own `package.json` and
 *     `dist/`, such as an `npm pack` extraction or another branch's checkout) instead of this
 *     repository's own build. Combine with `--json` or `--compare` as needed.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";

const rootDir = resolve(import.meta.dirname, "..");
const packageName = "@brazilian-utils/brazilian-utils";

const CONCURRENCY = 16;
const FULL_IMPORT_KEY = "__full__";

const REGRESSION_PERCENT_THRESHOLD = 0.2;
const REGRESSION_BYTES_THRESHOLD = 256;
const FULL_IMPORT_PERCENT_THRESHOLD = 0.05;

type Measurement = {
	bytes: number;
	gzip: number;
};

type Snapshot = {
	full: Measurement;
	exports: Record<string, Measurement>;
};

type Args = {
	json: string | undefined;
	compare: string | undefined;
	markdown: string | undefined;
	dist: string | undefined;
};

type CompareRow = {
	name: string;
	base: Measurement;
	head: Measurement;
	deltaBytes: number;
	deltaPercent: number;
};

type CompareResult = {
	changed: CompareRow[];
	unchanged: CompareRow[];
	added: (Measurement & { name: string })[];
	removed: (Measurement & { name: string })[];
	fullDeltaBytes: number;
	fullDeltaPercent: number;
	regressions: CompareRow[];
	fullImportRegressed: boolean;
};

const parseArgs = (argv: string[]): Args => {
	const args: Args = { json: undefined, compare: undefined, markdown: undefined, dist: undefined };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--json") args.json = argv[++i];
		else if (argv[i] === "--compare") args.compare = argv[++i];
		else if (argv[i] === "--markdown") args.markdown = argv[++i];
		else if (argv[i] === "--dist") args.dist = argv[++i];
	}
	return args;
};

const mapWithConcurrency = async <T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> => {
	const results: R[] = Array.from({ length: items.length });
	let cursor = 0;

	const worker = async (): Promise<void> => {
		const index = cursor++;

		if (index >= items.length) return;

		const item = items[index];

		if (item !== undefined) {
			results[index] = await fn(item);
		}

		await worker();
	};

	const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());

	await Promise.all(workers);
	return results;
};

const bundleSource = async (
	source: string,
	sourcefile: string,
	resolveDir: string,
): Promise<Uint8Array> => {
	const result = await build({
		stdin: {
			contents: source,
			resolveDir,
			sourcefile,
			loader: "js",
		},
		bundle: true,
		minify: true,
		format: "esm",
		write: false,
		logLevel: "error",
	});
	const outputFile = result.outputFiles[0];

	if (outputFile === undefined) {
		throw new Error(`esbuild produced no output for ${sourcefile}`);
	}

	return outputFile.contents;
};

const measure = async (
	name: string,
	source: string,
	resolveDir: string,
): Promise<Measurement & { name: string }> => {
	const contents = await bundleSource(source, `${name}.mjs`, resolveDir);
	return {
		name,
		bytes: contents.byteLength,
		gzip: gzipSync(contents, { level: 9 }).byteLength,
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const loadExports = async (
	distEntry: string,
): Promise<{ testable: string[]; aliasOf: Map<string, string> }> => {
	const mod: unknown = await import(pathToFileURL(distEntry).href);

	if (!isRecord(mod)) {
		throw new Error(`Unexpected default export shape for ${distEntry}`);
	}

	const functionExports = Object.keys(mod)
		.filter((name) => typeof mod[name] === "function")
		.sort();

	const groups = new Map<unknown, string[]>();
	for (const name of functionExports) {
		const value = mod[name];
		const group = groups.get(value);
		if (group) group.push(name);
		else groups.set(value, [name]);
	}

	const aliasOf = new Map<string, string>();
	for (const group of groups.values()) {
		if (group.length < 2) continue;
		const sorted = [...group].sort();
		const target = sorted.at(-1);

		if (target === undefined) continue;

		for (const name of sorted.slice(0, -1)) aliasOf.set(name, target);
	}

	const testable = functionExports.filter((name) => !aliasOf.has(name)).sort();
	return { testable, aliasOf };
};

const consumerResolveDir = async (packageRoot: string): Promise<string> => {
	if (packageRoot === rootDir) return rootDir;

	const consumerDir = await mkdtemp(join(tmpdir(), "tree-shaking-"));
	await mkdir(join(consumerDir, "node_modules", "@brazilian-utils"), { recursive: true });
	await symlink(packageRoot, join(consumerDir, "node_modules", packageName));
	return consumerDir;
};

const importSource = (names: string[]): string =>
	`import { ${names.join(", ")} } from "${packageName}";\nglobalThis.__keep = [${names.join(", ")}];\n`;

const measureExports = async (
	packageRoot: string,
): Promise<{
	full: Measurement;
	exports: Record<string, Measurement>;
	aliasOf: Map<string, string>;
	resolveDir: string;
}> => {
	const distEntry = resolve(packageRoot, "dist/brazilian-utils.js");
	if (!existsSync(distEntry)) {
		console.error(`Missing ${distEntry}. Run \`npm run build\` first.`);
		process.exit(1);
	}

	const { testable, aliasOf } = await loadExports(distEntry);
	const resolveDir = await consumerResolveDir(packageRoot);

	const [full, ...measurements] = await mapWithConcurrency(
		[
			{ name: FULL_IMPORT_KEY, names: testable },
			...testable.map((name) => ({ name, names: [name] })),
		],
		CONCURRENCY,
		({ name, names }) => measure(name, importSource(names), resolveDir),
	);

	if (full === undefined) {
		throw new Error("No measurements produced");
	}

	const exportsMap: Record<string, Measurement> = {};
	for (const m of measurements) exportsMap[m.name] = { bytes: m.bytes, gzip: m.gzip };
	for (const [alias, target] of aliasOf) {
		const targetMeasurement: Measurement | undefined = exportsMap[target];
		if (targetMeasurement !== undefined) exportsMap[alias] = targetMeasurement;
	}

	return { full: { bytes: full.bytes, gzip: full.gzip }, exports: exportsMap, aliasOf, resolveDir };
};

/**
 * Bundles one named import of every name in `names` at once, the way a consumer using that whole
 * API surface would.
 * @param {string[]} names - The export names to bundle together.
 * @param {string} resolveDir - The directory esbuild resolves the bundled import from.
 * @returns {Promise<Measurement>} The bundled size, in bytes and gzip bytes.
 */
const measureNames = async (names: string[], resolveDir: string): Promise<Measurement> => {
	if (names.length === 0) return { bytes: 0, gzip: 0 };
	const { bytes, gzip } = await measure("__existing__", importSource(names), resolveDir);
	return { bytes, gzip };
};

const printTable = (
	full: Measurement,
	exportsMap: Record<string, Measurement>,
	aliasOf: Map<string, string>,
): void => {
	const rows = Object.entries(exportsMap).sort(([, a], [, b]) => b.bytes - a.bytes);
	console.log(`${"name".padEnd(30)}${"bytes".padStart(9)}${"gzip".padStart(9)}  alias`);
	for (const [name, m] of rows) {
		const alias = aliasOf.get(name) ?? "-";
		console.log(
			`${name.padEnd(30)}${String(m.bytes).padStart(9)}${String(m.gzip).padStart(9)}  ${alias}`,
		);
	}
	console.log(`\n${rows.length} exports. Full import: ${full.bytes} B (gzip ${full.gzip} B).`);
};

const compareSnapshots = (base: Snapshot, head: Snapshot, existing: Measurement): CompareResult => {
	const names = new Set([...Object.keys(base.exports), ...Object.keys(head.exports)]);
	const changed: CompareRow[] = [];
	const unchanged: CompareRow[] = [];
	const added: (Measurement & { name: string })[] = [];
	const removed: (Measurement & { name: string })[] = [];

	for (const name of [...names].sort()) {
		const baseMeasurement: Measurement | undefined = base.exports[name];
		const headMeasurement: Measurement | undefined = head.exports[name];
		if (baseMeasurement === undefined) {
			if (headMeasurement === undefined) continue;
			added.push({ name, ...headMeasurement });
			continue;
		}
		if (headMeasurement === undefined) {
			removed.push({ name, ...baseMeasurement });
			continue;
		}

		const deltaBytes = headMeasurement.bytes - baseMeasurement.bytes;
		const deltaPercent = baseMeasurement.bytes === 0 ? 0 : deltaBytes / baseMeasurement.bytes;
		const row: CompareRow = {
			name,
			base: baseMeasurement,
			head: headMeasurement,
			deltaBytes,
			deltaPercent,
		};
		(deltaBytes === 0 ? unchanged : changed).push(row);
	}

	changed.sort((a, b) => Math.abs(b.deltaBytes) - Math.abs(a.deltaBytes));

	const fullDeltaBytes = existing.bytes - base.full.bytes;
	const fullDeltaPercent = base.full.bytes === 0 ? 0 : fullDeltaBytes / base.full.bytes;

	const regressions = changed.filter(
		(row) =>
			row.deltaBytes > REGRESSION_BYTES_THRESHOLD &&
			row.deltaPercent > REGRESSION_PERCENT_THRESHOLD,
	);
	const fullImportRegressed = fullDeltaPercent > FULL_IMPORT_PERCENT_THRESHOLD;

	return {
		changed,
		unchanged,
		added,
		removed,
		fullDeltaBytes,
		fullDeltaPercent,
		regressions,
		fullImportRegressed,
	};
};

const formatPercent = (value: number): string =>
	`${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

const formatBytes = (bytes: number): string =>
	Math.abs(bytes) < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

const formatDelta = (bytes: number, percent: number): string =>
	bytes === 0
		? "0 B"
		: `${bytes > 0 ? "+" : "-"}${formatBytes(Math.abs(bytes))} (${formatPercent(percent)})`;

const formatCount = (value: number): string => (value > 0 ? `+${value}` : String(value));

const MAX_VISIBLE_ROWS = 20;

const renderRows = (title: string, header: string[], rows: string[]): string[] => {
	if (rows.length === 0) return [];
	const table = [
		`| ${header.join(" | ")} |`,
		`| ${header.map((_column, index) => (index === 0 ? "---" : "---:")).join(" | ")} |`,
	];
	const visible = rows.slice(0, MAX_VISIBLE_ROWS);
	const hidden = rows.slice(MAX_VISIBLE_ROWS);
	const lines = [`### ${title} (${rows.length})`, "", ...table, ...visible, ""];
	if (hidden.length > 0) {
		lines.push(
			`<details><summary>Show the other ${hidden.length}</summary>`,
			"",
			...table,
			...hidden,
			"",
			"</details>",
			"",
		);
	}
	return lines;
};

const renderCollapsed = (title: string, header: string[], rows: string[]): string[] => {
	if (rows.length === 0) return [];
	return [
		`<details><summary>${title} (${rows.length})</summary>`,
		"",
		`| ${header.join(" | ")} |`,
		`| ${header.map((_column, index) => (index === 0 ? "---" : "---:")).join(" | ")} |`,
		...rows,
		"",
		"</details>",
		"",
	];
};

const renderMarkdown = (
	base: Snapshot,
	head: Snapshot,
	existing: Measurement,
	result: CompareResult,
): string => {
	const grown = result.changed.filter((row) => row.deltaBytes > 0).length;
	const shrunk = result.changed.length - grown;
	const regressionCount = result.regressions.length + (result.fullImportRegressed ? 1 : 0);
	const status =
		regressionCount === 0
			? "✅ **No size regression.**"
			: `❌ **${regressionCount} size regression${regressionCount === 1 ? "" : "s"}.**`;
	const counts = [
		`${Object.keys(head.exports).length} exports measured`,
		grown > 0 ? `${grown} grew` : "",
		shrunk > 0 ? `${shrunk} shrank` : "",
		result.added.length > 0 ? `${result.added.length} new` : "",
		result.removed.length > 0 ? `${result.removed.length} removed` : "",
	].filter((part) => part !== "");

	const lines: string[] = [
		"## Tree-shaking report",
		"",
		`${status} ${counts.join(", ")}.`,
		"",
		"| | Base | Head | Δ |",
		"| --- | ---: | ---: | ---: |",
		`| Pre-existing exports, all imported | ${formatBytes(base.full.bytes)} | ${formatBytes(existing.bytes)} (gzip ${formatBytes(existing.gzip)}) | ${result.fullImportRegressed ? "🔴 " : ""}${formatDelta(result.fullDeltaBytes, result.fullDeltaPercent)} |`,
		`| Full import | ${formatBytes(base.full.bytes)} | ${formatBytes(head.full.bytes)} (gzip ${formatBytes(head.full.gzip)}) | ${formatDelta(head.full.bytes - base.full.bytes, base.full.bytes === 0 ? 0 : (head.full.bytes - base.full.bytes) / base.full.bytes)} |`,
		`| Exports | ${Object.keys(base.exports).length} | ${Object.keys(head.exports).length} | ${formatCount(Object.keys(head.exports).length - Object.keys(base.exports).length)} |`,
		"",
	];

	const changedRows = result.changed.map((row) => {
		const marker = result.regressions.includes(row) ? "🔴" : row.deltaBytes > 0 ? "🟡" : "🟢";
		return `| ${marker} \`${row.name}\` | ${formatBytes(row.base.bytes)} | ${formatBytes(row.head.bytes)} | ${formatDelta(row.deltaBytes, row.deltaPercent)} | ${formatBytes(row.head.gzip)} |`;
	});
	lines.push(
		...renderRows("Changed exports", ["Export", "Base", "Head", "Δ", "gzip"], changedRows),
		...renderCollapsed(
			"New exports",
			["Export", "Size", "gzip"],
			result.added.map(
				(item) => `| \`${item.name}\` | ${formatBytes(item.bytes)} | ${formatBytes(item.gzip)} |`,
			),
		),
		...renderCollapsed(
			"Removed exports",
			["Export", "Was"],
			result.removed.map((item) => `| \`${item.name}\` | ${formatBytes(item.bytes)} |`),
		),
		...renderCollapsed(
			"Unchanged exports",
			["Export", "Size", "gzip"],
			result.unchanged.map(
				(row) =>
					`| \`${row.name}\` | ${formatBytes(row.head.bytes)} | ${formatBytes(row.head.gzip)} |`,
			),
		),
		"<details><summary>How this is measured</summary>",
		"",
		"Every export is imported alone into an esbuild consumer bundle (minified, tree-shaken) built from the head and from the base of this pull request; the sizes are the resulting bundles, gzip is their gzipped size. " +
			`🔴 marks a regression: a pre-existing export that grew more than ${REGRESSION_PERCENT_THRESHOLD * 100}% and more than ${REGRESSION_BYTES_THRESHOLD} B, or the bundle importing every pre-existing export growing more than ${FULL_IMPORT_PERCENT_THRESHOLD * 100}%. ` +
			"🟡 is growth under the threshold and 🟢 is a decrease. New exports never count as a regression. An intentional increase is accepted with the `tree-shaking: accepted` label.",
		"",
		"</details>",
	);

	return lines.join("\n");
};

const isMeasurement = (value: unknown): value is Measurement =>
	typeof value === "object" &&
	value !== null &&
	"bytes" in value &&
	typeof value.bytes === "number" &&
	"gzip" in value &&
	typeof value.gzip === "number";

const isSnapshot = (value: unknown): value is Snapshot =>
	typeof value === "object" &&
	value !== null &&
	"full" in value &&
	isMeasurement(value.full) &&
	"exports" in value &&
	isRecord(value.exports) &&
	Object.values(value.exports).every((entry) => isMeasurement(entry));

const main = async (): Promise<void> => {
	const args = parseArgs(process.argv.slice(2));
	const packageRoot =
		args.dist === undefined || args.dist === "" ? rootDir : resolve(process.cwd(), args.dist);

	const { full, exports: exportsMap, aliasOf, resolveDir } = await measureExports(packageRoot);

	if (args.json !== undefined && args.json !== "") {
		const snapshot: Snapshot = { full, exports: exportsMap };
		await writeFile(resolve(process.cwd(), args.json), `${JSON.stringify(snapshot, null, "\t")}\n`);
	}

	if (args.compare !== undefined && args.compare !== "") {
		const comparePath = resolve(process.cwd(), args.compare);
		const compareContents = await readFile(comparePath, "utf8");
		const parsedBase: unknown = JSON.parse(compareContents);

		if (!isSnapshot(parsedBase)) {
			throw new Error(`${comparePath} is not a valid tree-shaking snapshot`);
		}

		const base = parsedBase;
		const head: Snapshot = { full, exports: exportsMap };
		const existingNames = Object.keys(base.exports)
			.filter((name) => name in exportsMap && !aliasOf.has(name))
			.sort();
		const existing = await measureNames(existingNames, resolveDir);
		const result = compareSnapshots(base, head, existing);
		const markdown = renderMarkdown(base, head, existing, result);

		console.log(markdown);
		if (args.markdown !== undefined && args.markdown !== "") {
			await writeFile(resolve(process.cwd(), args.markdown), `${markdown}\n`);
		}

		if (result.regressions.length > 0 || result.fullImportRegressed) {
			console.error(
				`\n${result.regressions.length} export regression(s)` +
					`${result.fullImportRegressed ? ", full-import bundle regressed" : ""}.`,
			);
			process.exit(1);
		}
		return;
	}

	printTable(full, exportsMap, aliasOf);
};

await main();
