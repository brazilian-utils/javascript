import { CID10_SUBCATEGORIES } from "../constants/cid10";
import { CID10_DESCRIPTIONS } from "../constants/cid10-descriptions";
import { expect } from "./runtime";

/**
 * Rebuilds the `code -> description` record of a generated lookup table from its two halves, the
 * fixed-width codes written back to back and the descriptions aligned with them, so a test can
 * read an expected description by code the way the table was keyed before it was split.
 *
 * @param {string} codes - The codes of the table, back to back.
 * @param {number} width - The width of every code.
 * @param {readonly T[]} descriptions - The description of each code, at the index of that code.
 * @returns {Record<string, T>} The descriptions, keyed by code.
 */
export const lookupTable = <T>(
	codes: string,
	width: number,
	descriptions: readonly T[],
): Record<string, T> =>
	Object.fromEntries(
		descriptions.map((description, index) => [
			codes.slice(index * width, index * width + width),
			description,
		]),
	);

/**
 * Expects a generated lookup table to stay aligned: one description per code, codes of the table
 * width only, in strictly ascending order, and a non-empty text in every description (every
 * member of it, for a table whose description is a tuple).
 *
 * @param {string} codes - The codes of the table, back to back.
 * @param {number} width - The width of every code.
 * @param {readonly unknown[]} descriptions - The description of each code, at the index of that code.
 */
export const expectAlignedLookupTable = (
	codes: string,
	width: number,
	descriptions: readonly unknown[],
): void => {
	const list = codes.match(new RegExp(`.{${width}}`, "g")) ?? [];

	expect(list.join("")).toBe(codes);
	expect(list).toHaveLength(descriptions.length);
	expect(list.every((code, index) => index === 0 || list[index - 1] < code)).toBe(true);

	for (const description of descriptions.flat()) {
		expect(typeof description === "string" && description.trim() !== "").toBe(true);
	}
};

/**
 * Every CID-10 code of `CID10_SUBCATEGORIES`, in its order: each category followed by its
 * subcategories, the order `CID10_DESCRIPTIONS` is aligned with.
 *
 * @returns {string[]} The codes, without the dot.
 */
export const cid10Codes = (): string[] => {
	const codes: string[] = [];

	for (const [category, subcategories] of Object.entries(CID10_SUBCATEGORIES)) {
		codes.push(category);

		for (const subcategory of subcategories) codes.push(category + subcategory);
	}

	return codes;
};

/**
 * The CID-10 descriptions keyed by code, the way the table was shipped before it became an array
 * aligned with `cid10Codes`.
 *
 * @returns {Record<string, string>} The description of every code, without the dot.
 */
export const cid10Table = (): Record<string, string> =>
	Object.fromEntries(cid10Codes().map((code, index) => [code, CID10_DESCRIPTIONS[index]]));
