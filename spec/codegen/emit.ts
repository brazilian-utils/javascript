/**
 * Emits every language target from the specs.
 *
 * Usage: `node spec/codegen/emit.ts [target...]` (default: every target).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { emitConformance } from "./conformance.ts";
import { specRoot } from "./ir.ts";
import { planFor } from "./plan.ts";
import { emitters } from "./targets/registry.ts";
import { type Vectors } from "./vectors.ts";

const vectors = JSON.parse(
	readFileSync(resolve(specRoot, "vectors/conformance.json"), "utf8"),
) as Vectors;

const requested = process.argv.slice(2);
const selected = requested.length > 0 ? requested : Object.keys(emitters);

for (const target of selected) {
	const emitter = emitters[target];

	if (emitter === undefined) throw new Error(`unknown target: ${target}`);

	const plan = planFor(target);
	const files = { ...emitter(plan), ...emitConformance(plan, vectors) };
	const outDir = resolve(specRoot, "generated", target);

	rmSync(outDir, { recursive: true, force: true });

	for (const [path, contents] of Object.entries(files)) {
		const full = resolve(outDir, path);

		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, contents);
	}

	console.log(`${target.padEnd(11)} ${Object.keys(files).length} files`);
}
