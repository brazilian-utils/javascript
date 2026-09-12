const COMBINING_MARKS_REGEX = /\p{M}/gu;

/**
 * Removes diacritical marks (accents, tildes, cedillas) from a string, decomposing every
 * accented character into its base letter plus combining marks (Unicode NFD) and then
 * dropping every combining mark (Unicode general category M, so accents from any script).
 *
 * @param {string} value - The text to strip accents from.
 * @returns {string} The text with every diacritical mark removed. `""` when `value` is not a
 * non-empty string.
 *
 * @example
 * ```typescript
 * removeAccents("São Paulo"); // "Sao Paulo"
 * removeAccents("Piauí"); // "Piaui"
 * removeAccents("Ceará"); // "Ceara"
 * removeAccents("Açaí"); // "Acai"
 * removeAccents(""); // ""
 * ```
 */
export const removeAccents = (value: string): string => {
	if (typeof value !== "string") return "";

	return value.normalize("NFD").replace(COMBINING_MARKS_REGEX, "");
};
