#!/usr/bin/env node

/**
 * Keeps the `exports` of `jsr.json` in step with `src/`: the package root plus one subpath per
 * utility folder, the same folders `vite.config.ts` turns into the npm subpaths, so
 * `jsr:@brazilian-utils/brazilian-utils/is-valid-cpf` resolves like its npm counterpart. JSR
 * publishes the TypeScript sources as they are, so an export points at the `.ts` file.
 *
 * Everything else in `jsr.json` is left alone, the `version` in particular: release-please bumps
 * it together with `package.json` (see `extra-files` in `release-please-config.json`). The Check
 * workflow fails when the file is stale.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SOURCE_DIRECTORY = join(ROOT, "src");
const JSR_PATH = join(ROOT, "jsr.json");

const utilityNames = readdirSync(SOURCE_DIRECTORY, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
	.map((entry) => entry.name)
	.filter((name) => existsSync(join(SOURCE_DIRECTORY, name, `${name}.ts`)))
	.toSorted();

const exports: Record<string, string> = { ".": "./src/index.ts" };

for (const name of utilityNames) {
	exports[`./${name}`] = `./src/${name}/${name}.ts`;
}

// Only the `exports` block is rewritten, in place: the rest of the file keeps the layout the
// formatter gave it, so a second run (the staleness check of the Check workflow) finds nothing to
// change, and the `version` release-please maintains is never touched.
const EXPORTS_BLOCK = /"exports": \{[^}]*\}/;
const current = readFileSync(JSR_PATH, "utf8");

if (!EXPORTS_BLOCK.test(current)) {
	throw new Error("jsr.json has no exports block");
}

const block = JSON.stringify(exports, null, "\t").replaceAll("\n", "\n\t");

writeFileSync(
	JSR_PATH,
	current.replace(EXPORTS_BLOCK, () => `"exports": ${block}`),
);
