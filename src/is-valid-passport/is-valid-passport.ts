import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { PASSPORT_REGEX } from "./constants";

/**
 * Checks if a Brazilian passport number is valid.
 * To be considered valid, the sanitized input must contain exactly two alphabetical
 * characters followed by exactly six numerical digits. The input is case-insensitive and
 * any non-alphanumeric characters (spaces, dots, hyphens, etc.) are ignored, mirroring the
 * sanitization performed by `formatPassport`/`parsePassport`.
 * This function does not verify if the input is a real passport number,
 * as there are no checksums for the Brazilian passport.
 *
 * @param {string|number} passport - The string containing the passport number to be checked.
 * @returns {boolean} True if the passport number is valid (2 letters followed by 6 digits).
 *
 * @example
 * isValidPassport("AB123456") // true
 * isValidPassport("ab123456") // true (case-insensitive)
 * isValidPassport("AB-123.456") // true (symbols are ignored)
 * isValidPassport("12345678") // false
 * isValidPassport("DC-221345extra") // false
 *
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte
 */
export const isValidPassport = (passport: string | number): boolean => {
	if (isNullish(passport)) return false;

	return PASSPORT_REGEX.test(sanitizeToAlphanumeric(passport));
};
