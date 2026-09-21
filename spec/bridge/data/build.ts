/**
 * Builds the datasets the portable source reads.
 *
 * A dataset is a table plus the two orders the utilities need: the per key order and the full
 * order. Both are resolved here, once, against the JavaScript package's own data and its own
 * `localeCompare(…, "pt-BR")`, and then baked into the JSON the emitters materialise natively.
 *
 * Collation is the reason this step exists. `"Á".localeCompare("B", "pt-BR")` is a locale
 * database lookup, and no two of the seven targets ship the same one: Go has no collator in the
 * standard library, Rust has none either, Ruby compares bytes, and Java, C# and Python each
 * resolve their own ICU or libc table. Sorting at run time would therefore produce seven
 * different orders. Sorting here produces one, and every target replays it.
 *
 * Usage: `node spec/bridge/data/build.ts`
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "esbuild";

const bridge = resolve(import.meta.dirname, "..");
const root = resolve(bridge, "../..");

const outDir = mkdtempSync(join(tmpdir(), "brutils-data-"));
const bundlePath = join(outDir, "shipped.mjs");

await build({
	entryPoints: [resolve(root, "src/index.ts")],
	bundle: true,
	format: "esm",
	platform: "neutral",
	outfile: bundlePath,
	logLevel: "error",
});

const shipped = (await import(bundlePath)) as {
	getStates: () => { code: string }[];
	getMunicipalities: (stateCode?: string) => { code: string; name: string; stateCode: string }[];
};

rmSync(outDir, { recursive: true, force: true });

const columns = ["stateCode", "name", "code"];
const rows: string[][] = [];
const groups: Record<string, number[]> = {};

// The per state order is the order the package itself returns, which is already the pt-BR one.
for (const state of shipped.getStates()) {
	groups[state.code] = [];

	for (const municipality of shipped.getMunicipalities(state.code)) {
		groups[state.code].push(rows.length);
		rows.push([municipality.stateCode, municipality.name, municipality.code]);
	}
}

// The full order is the one `getMunicipalities()` returns: every state's rows merged and sorted
// by name with the pt-BR collator. Matching it by (name, code) rather than by position keeps
// this honest even if the package ever changes how it merges the states.
const byKey = new Map<string, number>();

for (const [index, row] of rows.entries()) byKey.set(`${row[1]}\u0000${row[2]}`, index);

const fullOrder = shipped.getMunicipalities().map((municipality) => {
	const index = byKey.get(`${municipality.name}\u0000${municipality.code}`);

	if (index === undefined)
		throw new Error(`the full list holds ${municipality.name} but no state does`);

	return index;
});

if (fullOrder.length !== rows.length)
	throw new Error(`the full list has ${fullOrder.length} rows but the states have ${rows.length}`);

const dataset = {
	doc: "Brazilian municipalities published by the IBGE, by state, in the pt-BR collation order the JavaScript package returns.",
	columns,
	rows,
	groups,
	fullOrder,
};

writeFileSync(resolve(bridge, "source/municipalities.data.json"), `${JSON.stringify(dataset)}\n`);

console.log(
	`municipalities: ${rows.length} rows, ${Object.keys(groups).length} groups, full order baked`,
);
