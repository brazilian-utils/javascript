import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { ISBN_LENGTH } from "./constants";

/**
 * Removes the hyphens and every other character that is not a digit from an ISBN-13, keeping at
 * most its 13 digits.
 *
 * @param {string} value - The ISBN, with or without hyphens.
 * @returns {string} Up to 13 digits, or `""` when `value` is not a string.
 *
 * @example
 * ```typescript
 * parseIsbn("978-65-89999-01-0"); // "9786589999010"
 * parseIsbn("978 65 89999 01 0"); // "9786589999010"
 * ```
 *
 * @see Official: https://www.cblservicos.org.br/isbn/estrutura/
 * Agência Brasileira do ISBN, "Estrutura do ISBN": printed, the elements are separated by hyphens.
 */
export const parseIsbn = (value: string): string => {
	if (typeof value !== "string") return "";

	return sanitizeToDigits(value).slice(0, ISBN_LENGTH);
};
