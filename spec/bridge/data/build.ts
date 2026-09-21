/**
 * Builds the datasets the portable source reads.
 *
 * A dataset is a table plus the orders the utility needs: the per key order and the full
 * order. Both are resolved here, once, against the JavaScript package's own data and its own
 * comparator, and then baked into the JSON every emitter materialises natively.
 *
 * Collation is the reason this step exists. `"Á".localeCompare("B", "pt-BR")` is a locale
 * database lookup, and no two of the seven targets ship the same one: Go has no collator in
 * the standard library, Rust has none either, Ruby compares bytes, and Java, C# and Python
 * each resolve their own ICU or libc table. Sorting at run time would therefore produce seven
 * different orders. Sorting here produces one, and every target replays it.
 *
 * One file per dataset under `data/`, named after the utility that reads it, the same way
 * `conformance/cases/` is. This runs all of them.
 *
 * Usage: `node spec/bridge/data/build.ts`
 */
import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadShipped } from "../conformance/shipped.ts";
import { type Builder } from "./_builder.ts";

const here = import.meta.dirname;
const shipped = await loadShipped();
// A `_` prefix is shared scaffolding, not a dataset.
const names = readdirSync(here).filter(
	(name) => name.endsWith(".ts") && name !== "build.ts" && !name.startsWith("_"),
);

if (names.length === 0) console.log("no datasets under data/: nothing to build");

for (const name of names.sort()) {
	const loaded = (await import(resolve(here, name))) as { builder: Builder };
	const dataset = loaded.builder.build(shipped);

	writeFileSync(
		resolve(here, "..", "source", `${loaded.builder.module}.data.json`),
		`${JSON.stringify(dataset)}\n`,
	);

	console.log(
		`${loaded.builder.module.padEnd(26)} ${dataset.rows.length} rows, ${Object.keys(dataset.groups).length} groups, full order baked`,
	);
}
