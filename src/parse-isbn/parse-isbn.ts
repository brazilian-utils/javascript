import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { ISBN_LABEL_REGEX, ISBN_LENGTH } from "./constants";

/**
 * Removes the "ISBN" label, the hyphens and every other character that is not a digit from an
 * ISBN-13, keeping at most its 13 digits. The label goes first, so the "13" of "ISBN-13" is not
 * read as part of the number.
 *
 * @param {string} value - The ISBN, printed or not.
 * @returns {string} Up to 13 digits, or `""` when `value` is not a string.
 *
 * @example
 * ```typescript
 * parseIsbn("ISBN 978-65-89999-01-0"); // "9786589999010"
 * parseIsbn("ISBN-13: 978-85-333-0227-3"); // "9788533302273"
 * parseIsbn("978 65 89999 01 0"); // "9786589999010"
 * ```
 *
 * @see Official: https://www.cblservicos.org.br/isbn/estrutura/
 * Agência Brasileira do ISBN, "Estrutura do ISBN": printed, the digits are always preceded by
 * "ISBN" and the elements are separated by hyphens.
 */
export const parseIsbn = (value: string): string => {
	if (typeof value !== "string") return "";

	// Stryker disable next-line StringLiteral: the label is only removed so that its "13" is not read as digits; whatever replaces it without digits is dropped by sanitizeToDigits all the same.
	return sanitizeToDigits(value.replace(ISBN_LABEL_REGEX, "")).slice(0, ISBN_LENGTH);
};
