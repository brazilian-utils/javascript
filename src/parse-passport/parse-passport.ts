import { PASSPORT_LENGTH } from "../_internals/constants/passport";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

/**
 * Removes non-alphanumeric characters from a passport number, uppercases it, and caps it to 8 characters.
 *
 * @param {string} passport - The string containing a passport number.
 * @returns {string} The normalized passport number.
 *
 * @example
 * parsePassport("Ab123456") // "AB123456"
 * parsePassport("Ab-123456") // "AB123456"
 * parsePassport("Ab -. 123456") // "AB123456"
 *
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte
 */
export const parsePassport = (passport: string): string => {
	if (typeof passport !== "string") return "";
	return sanitizeToAlphanumeric(passport).slice(0, PASSPORT_LENGTH);
};
