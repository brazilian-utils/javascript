/**
 * The package this repository ships, loaded as one module.
 *
 * Every expectation in the conformance tables is what this answered. Bundling `src/index.ts`
 * rather than importing the files one by one keeps the recording honest: it is the same entry
 * point a consumer of the npm package imports, with the same internals behind it.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "esbuild";

import { type Shipped } from "./cases.ts";

/**
 * Bundles and imports the shipped package.
 *
 * @returns {Promise<Shipped>} Its exports.
 */
export const loadShipped = async (): Promise<Shipped> => {
	const root = resolve(import.meta.dirname, "../../..");
	const outDir = mkdtempSync(join(tmpdir(), "brutils-bridge-"));
	const bundlePath = join(outDir, "shipped.mjs");

	await build({
		entryPoints: [resolve(root, "src/index.ts")],
		bundle: true,
		format: "esm",
		platform: "neutral",
		outfile: bundlePath,
		logLevel: "error",
	});

	const shipped = (await import(bundlePath)) as Shipped;

	rmSync(outDir, { recursive: true, force: true });

	return shipped;
};
