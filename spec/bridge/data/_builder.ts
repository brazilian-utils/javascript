/**
 * What a dataset builder under `data/` exports.
 *
 * Its own file, rather than `build.ts`, so that a builder can name the type without importing
 * the runner that imports it.
 */
import { type DataDecl } from "../compiler/ir.ts";
import { type Shipped } from "../conformance/cases.ts";

export type Builder = {
	/** The module under `source/`, whose `<module>.data.json` this writes. */
	module: string;
	/**
	 * Builds the table.
	 *
	 * @param shipped - The package this repository ships, bundled.
	 * @returns The dataset, less its name.
	 */
	build: (shipped: Shipped) => Omit<DataDecl, "name">;
};
