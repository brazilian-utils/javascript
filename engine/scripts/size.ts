#!/usr/bin/env node
/**
 * What a consumer of the generated TypeScript actually pays, per utility.
 *
 * The npm package this engine generates for is tree-shakeable, and ADR 0012 records that as a
 * requirement rather than a preference: a consumer who imports `isValidCpf` must not carry
 * `getHolidays`. So the TypeScript target's cost is not only nanoseconds — it is bytes over the
 * wire — and a cost that is never measured is a cost that is asserted.
 *
 * This measures it the way a consumer's bundler would: one single-import entry point per exported
 * utility, bundled and minified by esbuild against the generated tree, then gzipped. Raw source
 * bytes are the wrong number (comments, types and formatting all vanish before a browser sees
 * them), and the whole tree is the wrong number too (nobody imports all of it).
 *
 * Usage:
 *   node engine/scripts/size.ts <project>
 *     Print the table. Nothing is written: the committed `SIZE.json` is a baseline, and a baseline
 *     that moves whenever it is looked at is not one.
 *
 *   node engine/scripts/size.ts <project> --check
 *     Compare against the committed `SIZE.json` and exit 1 when any export grew at all. This is
 *     what `verify` runs: the trade is checked, not remembered.
 *
 *   node engine/scripts/size.ts <project> --write
 *     Accept the current measurement as the new baseline.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

import { build } from "esbuild";

/**
 * How many gzipped bytes a pre-existing export may grow before it counts as a regression.
 *
 * Zero, deliberately. Every other target's optimizations are paid for in the currency that target
 * is judged in, and for this one that currency is bytes a browser downloads: an optimization here
 * is only an optimization if the bundle does not grow for it. The number is not a tolerance to be
 * widened when something gets close — a change that needs more room is a change whose trade has to
 * be argued, measured and written down, and then accepted with `--write`.
 *
 * Measured on gzipped output, so it is also not noisy: the same input produces the same bytes.
 */
const GROWTH_BYTES = 0;

/**
 * Three numbers, because they answer different questions and this project has been wrong about
 * which one matters before.
 *
 * `minified` is what the browser parses and what the JavaScript engine holds — it is not the
 * transfer size, but it is the only one of the three that tracks parse and compile cost.
 * `gzip` and `brotli` are both transfer sizes, and they disagree: gzip's window makes locally
 * repeated text almost free, so a shorter but less repetitive encoding can be smaller raw and
 * larger gzipped. Brotli's larger window and its static dictionary of common web text weigh the
 * same source differently, and brotli is what most CDNs actually serve. Both are gated, so a
 * change has to be no worse under either.
 */
type Measurement = { minified: number; gzip: number; brotli: number };
type Snapshot = { exports: Record<string, Measurement>; total: Measurement };

type ApiFunction = { name: string; module: string; effects: readonly string[] };

function exportsOf(outDir: string): ApiFunction[] {
	const api = JSON.parse(readFileSync(join(outDir, "API.json"), "utf8")) as { functions: ApiFunction[] };
	// One row per public entry point, which is what a consumer writes. The `…With` seam (ADR 0011)
	// is reachable from the same module and is measured by whichever of its callers pulls it in.
	return [...api.functions].sort((a, b) => a.name.localeCompare(b.name));
}

async function measure(outDir: string, entries: readonly { name: string; module: string }[]): Promise<Measurement> {
	const scratch = mkdtempSync(join(tmpdir(), "engine-size-"));
	try {
		const imports = entries
			.map((entry, index) => `import { ${entry.name} as e${index} } from ${JSON.stringify(join(outDir, entry.module))};`)
			.join("\n");
		const uses = entries.map((_, index) => `e${index}`).join(", ");
		// `globalThis.__keep` is an escape the optimizer cannot see through, so nothing measured here
		// is dropped for being unobserved — only for being genuinely unreachable from the import.
		const entryPath = join(scratch, "entry.ts");
		writeFileSync(entryPath, `${imports}\nglobalThis.__keep = [${uses}];\n`);
		const result = await build({
			entryPoints: [entryPath],
			bundle: true,
			minify: true,
			format: "esm",
			platform: "browser",
			target: "es2020",
			treeShaking: true,
			write: false,
			legalComments: "none",
		});
		const code = result.outputFiles[0]!.contents;
		return {
			minified: code.byteLength,
			gzip: gzipSync(code, { level: 9 }).byteLength,
			// Quality 11 and a size hint, because the defaults are tuned for streaming and would
			// understate what a CDN serving a static asset produces.
			brotli: brotliCompressSync(code, {
				params: {
					[constants.BROTLI_PARAM_QUALITY]: 11,
					[constants.BROTLI_PARAM_SIZE_HINT]: code.byteLength,
				},
			}).byteLength,
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

function formatBytes(value: number): string {
	return value.toLocaleString("en-US");
}

async function main(): Promise<void> {
	const project = resolve(process.argv[2] ?? ".");
	const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--write") ? "write" : "print";
	const outDir = join(project, "out", "typescript");
	if (!existsSync(join(outDir, "API.json"))) {
		process.stdout.write(`skipped: no generated TypeScript at ${outDir}\n`);
		return;
	}

	const api = exportsOf(outDir);
	const rows = await Promise.all(
		api.map(async (fn) => ({ name: fn.name, measurement: await measure(outDir, [fn]) })),
	);
	const total = await measure(outDir, api);

	const snapshot: Snapshot = {
		exports: Object.fromEntries(rows.map((row) => [row.name, row.measurement])),
		total,
	};

	const namePad = Math.max(8, ...rows.map((row) => row.name.length));
	const line = (name: string, measurement: Measurement): string =>
		`${name.padEnd(namePad)}  ${formatBytes(measurement.minified).padStart(10)}  ${formatBytes(measurement.gzip).padStart(8)}  ${formatBytes(measurement.brotli).padStart(8)}\n`;
	process.stdout.write(
		`${"export".padEnd(namePad)}  ${"minified".padStart(10)}  ${"gzip".padStart(8)}  ${"brotli".padStart(8)}\n`,
	);
	for (const row of rows) process.stdout.write(line(row.name, row.measurement));
	process.stdout.write(line("(all)", total));

	const snapshotPath = join(outDir, "SIZE.json");
	if (mode === "check") {
		if (!existsSync(snapshotPath)) {
			process.stdout.write("no SIZE.json to compare against\n");
			process.exitCode = 1;
			return;
		}
		const base = JSON.parse(readFileSync(snapshotPath, "utf8")) as Snapshot;
		const regressions: string[] = [];
		// Both transfer encodings, because a consumer gets whichever their CDN negotiates and the
		// two do not agree on which source is smaller. `minified` is reported but not gated: it is
		// a parse cost, not a transfer cost, and a change that trades it against a transfer size is
		// a trade to argue rather than a threshold to trip.
		const compared = ["gzip", "brotli"] as const;
		const check = (label: string, previous: Measurement, current: Measurement): void => {
			for (const metric of compared) {
				const grew = current[metric] - previous[metric];
				if (grew > GROWTH_BYTES) {
					regressions.push(
						`${label}: ${formatBytes(previous[metric])} -> ${formatBytes(current[metric])} ${metric} (+${formatBytes(grew)})`,
					);
				}
			}
		};
		for (const [name, measurement] of Object.entries(snapshot.exports)) {
			const previous = base.exports[name];
			if (previous === undefined) continue;
			check(name, previous, measurement);
		}
		check("(all)", base.total, snapshot.total);
		if (regressions.length > 0) {
			process.stdout.write(`\n${regressions.length} size regression(s):\n${regressions.map((line) => `  ${line}`).join("\n")}\n`);
			process.exitCode = 1;
		}
		return;
	}

	if (mode !== "write") return;
	writeFileSync(snapshotPath, `${JSON.stringify(snapshot, undefined, "\t")}\n`);
	process.stdout.write(`\nwrote ${snapshotPath}\n`);
}

await main();
