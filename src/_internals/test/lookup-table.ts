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
