import { sanitizeToAlphanumeric } from "../sanitize-to-alphanumeric/sanitize-to-alphanumeric";

const CID10_FORMAT_REGEX = /^[A-Za-z]\d{2}(?:\.?\d)?$/;

/**
 * Reads a CID-10 code written in one of its documented forms and returns the key the CID-10
 * tables are indexed by: upper case, without the dot.
 *
 * The documented forms are the 3 character category (`A00`) and the 4 character subcategory,
 * with the dot (`A00.0`) or without it (`A000`), in any letter case and with optional
 * surrounding whitespace. Anything else, a value that is not a string included, gives an empty
 * string, which is not a key of any table.
 *
 * @param {unknown} value - The value to read.
 * @returns {string} The 3 or 4 character code, or an empty string when the value is not written
 * in a documented form.
 *
 * @example
 * ```typescript
 * normalizeCid10("A00.0"); // "A000"
 * normalizeCid10(" f32 "); // "F32"
 * normalizeCid10("A00-0"); // ""
 * normalizeCid10(100); // ""
 * ```
 */
export const normalizeCid10 = (value: unknown): string => {
	if (typeof value !== "string") return "";

	const code = value.trim();

	return CID10_FORMAT_REGEX.test(code) ? sanitizeToAlphanumeric(code) : "";
};
