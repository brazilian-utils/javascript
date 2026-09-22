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
 *     Compare against the committed `SIZE.json` and exit 1 when an export grew past the budget
 *     below. This is what `verify` runs: the trade is checked, not remembered.
 *
 *   node engine/scripts/size.ts <project> --write
 *     Accept the current measurement as the new baseline.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";

/** A pre-existing export may grow by this fraction before it counts as a regression. */
const GROWTH_RATIO = 0.05;
/** …and by this many gzipped bytes, whichever is larger, so that tiny exports are not noisy. */
const GROWTH_BYTES = 64;

type Measurement = { minified: number; gzip: number };
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
		return { minified: code.byteLength, gzip: gzipSync(code, { level: 9 }).byteLength };
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
	process.stdout.write(`${"export".padEnd(namePad)}  ${"minified".padStart(10)}  ${"gzip".padStart(8)}\n`);
	for (const row of rows) {
		process.stdout.write(
			`${row.name.padEnd(namePad)}  ${formatBytes(row.measurement.minified).padStart(10)}  ${formatBytes(row.measurement.gzip).padStart(8)}\n`,
		);
	}
	process.stdout.write(
		`${"(all)".padEnd(namePad)}  ${formatBytes(total.minified).padStart(10)}  ${formatBytes(total.gzip).padStart(8)}\n`,
	);

	const snapshotPath = join(outDir, "SIZE.json");
	if (mode === "check") {
		if (!existsSync(snapshotPath)) {
			process.stdout.write("no SIZE.json to compare against\n");
			process.exitCode = 1;
			return;
		}
		const base = JSON.parse(readFileSync(snapshotPath, "utf8")) as Snapshot;
		const regressions: string[] = [];
		for (const [name, measurement] of Object.entries(snapshot.exports)) {
			const previous = base.exports[name];
			if (previous === undefined) continue;
			const grew = measurement.gzip - previous.gzip;
			if (grew > GROWTH_BYTES && grew / previous.gzip > GROWTH_RATIO) {
				regressions.push(`${name}: ${formatBytes(previous.gzip)} -> ${formatBytes(measurement.gzip)} gzip (+${formatBytes(grew)})`);
			}
		}
		const grewTotal = snapshot.total.gzip - base.total.gzip;
		if (grewTotal > GROWTH_BYTES && grewTotal / base.total.gzip > GROWTH_RATIO) {
			regressions.push(`(all): ${formatBytes(base.total.gzip)} -> ${formatBytes(snapshot.total.gzip)} gzip (+${formatBytes(grewTotal)})`);
		}
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
