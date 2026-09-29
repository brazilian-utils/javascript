import { readCid10Subcategories } from "../read-cid10-subcategories/read-cid10-subcategories";

let cache: Record<string, number> | undefined;

/**
 * Reads where the description of each CID-10 category sits in `CID10_DESCRIPTIONS`, which lists
 * every category followed by its subcategories: a category starts one description plus one per
 * subcategory after the previous one. The offsets are built on the first read and the same
 * object is handed back after that, so a caller must not change it.
 *
 * @returns {Record<string, number>} The index of the description of each category, keyed by
 * category.
 *
 * @example
 * ```typescript
 * readCid10CategoryOffsets().A00; // 0
 * readCid10CategoryOffsets().A01; // 4
 * ```
 */
export const readCid10CategoryOffsets = (): Record<string, number> => {
	if (cache !== undefined) return cache;

	const offsets: Record<string, number> = {};
	let offset = 0;

	for (const [category, subcategories] of Object.entries(readCid10Subcategories())) {
		offsets[category] = offset;
		offset += 1 + subcategories.length;
	}

	cache = offsets;

	return offsets;
};
