import { PASSPORT_LENGTH } from "../_internals/constants/passport";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

/**
 * Formats a Brazilian passport number for display.
 * Converts to uppercase and removes all non-alphanumeric characters.
 *
 * @param {string} passport - A Brazilian passport number (any case, possibly with symbols).
 * @returns {string} The formatted passport number (uppercase, no symbols), or an empty string if invalid.
 *
 * @example
 * formatPassport("ab123456") // "AB123456"
 * formatPassport("AB-123.456") // "AB123456"
 * formatPassport("") // ""
 *
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte
 */
export const formatPassport = (passport: string): string => {
	if (typeof passport !== "string") return "";
	return sanitizeToAlphanumeric(passport).slice(0, PASSPORT_LENGTH);
};
