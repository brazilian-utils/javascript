import { CID10_DESCRIPTIONS } from "../constants/cid10-descriptions";
import { readCid10Subcategories } from "../read-cid10-subcategories/read-cid10-subcategories";
import { unpackTexts } from "../unpack-texts/unpack-texts";
import { expect } from "./runtime";

/**
 * Unpacks a lookup table packed by `packCodes` (`scripts/lookup-table.ts`) into its codes, each
 * zero-padded to the table width, independently of the `findCodeIndex` it checks.
 *
 * @param {string} codes - The packed table, e.g. `"3:1,2,1"`.
 * @returns {string[]} Its codes, e.g. `["001", "003", "004"]`.
 */
export const unpackCodes = (codes: string): string[] => {
	const [width, differences] = codes.split(":");
	let previous = 0;

	return differences.split(",").map((difference) => {
		previous += Number.parseInt(difference, 36);

		return String(previous).padStart(Number(width), "0");
	});
};

/**
 * Rebuilds the `code -> description` record of a generated lookup table from its two halves, the
 * codes packed by `packCodes` and the descriptions aligned with them, so a test can
 * read an expected description by code the way the table was keyed before it was split.
 *
 * @param {string} codes - The codes of the table, packed by `packCodes`.
 * @param {number} width - The width of every code.
 * @param {string | readonly T[]} descriptions - The description of each code, at the index of that
 * code: the array, or the texts packed by `packTexts`.
 * @returns {Record<string, T>} The descriptions, keyed by code.
 */
export const lookupTable = <T = string>(
	codes: string,
	width: number,
	descriptions: string | readonly T[],
): Record<string, T> => {
	const list = unpackCodes(codes);

	expect(list.every((code) => code.length === width)).toBe(true);

	const texts = (
		typeof descriptions === "string" ? unpackTexts(descriptions) : descriptions
	) as readonly T[];

	return Object.fromEntries(texts.map((description, index) => [list[index], description]));
};

/**
 * Expects a generated lookup table to stay aligned: one description per code, codes of the table
 * width only, in strictly ascending order, and a non-empty text in every description (every
 * member of it, for a table whose description is a tuple).
 *
 * @param {string} codes - The codes of the table, packed by `packCodes`.
 * @param {number} width - The width of every code.
 * @param {string | readonly unknown[]} descriptions - The description of each code, at the index of
 * that code: the array, or the texts packed by `packTexts`.
 */
export const expectAlignedLookupTable = (
	codes: string,
	width: number,
	packedOrList: string | readonly unknown[],
): void => {
	const list = unpackCodes(codes);
	const descriptions = typeof packedOrList === "string" ? unpackTexts(packedOrList) : packedOrList;

	expect(list.every((code) => code.length === width && /^\d+$/.test(code))).toBe(true);
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

	for (const [category, subcategories] of Object.entries(readCid10Subcategories())) {
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
	Object.fromEntries(
		cid10Codes().map((code, index) => [code, unpackTexts(CID10_DESCRIPTIONS)[index]]),
	);
