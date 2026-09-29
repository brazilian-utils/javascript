import { gs1CheckDigit } from "../_internals/gs1-check-digit/gs1-check-digit";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * The 13 digits of an ISBN, starting with a GS1 prefix of the ISBN system (978 or 979), with any
 * run of the mask characters `isValidCpf` reads (whitespace, `.`, `-`, `/`) between two digits:
 * the ISBN groups vary in length, so any two digits may be a boundary.
 */
const FORMAT_REGEX = /^9[\s.\-/]*7[\s.\-/]*[89](?:[\s.\-/]*\d){10}$/;

/** The prefix 979-0, given to the ISMN (printed music), not to the ISBN. */
const ISMN_PREFIX = "9790";

/**
 * Validates if an ISBN-13 (International Standard Book Number) is valid.
 * Accepts the usual mask characters (`.`, `-`, `/`) and whitespace around the value and between
 * two digits, alone or in a run.
 *
 * @param {string} value - The ISBN to validate.
 * @returns {boolean} True if the ISBN is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidIsbn("9786589999010"); // true
 * isValidIsbn("978-65-89999-01-0"); // true
 * isValidIsbn("978-65-89999-01-3"); // false (wrong check digit)
 * isValidIsbn("8533302274"); // false (the 10 digit form)
 * isValidIsbn("9776589999014"); // false (977 is not an ISBN prefix)
 * isValidIsbn("9790260000438"); // false (979-0 is an ISMN, not an ISBN)
 * ```
 *
 * An ISBN has 13 digits: the GS1 prefix (978, or 979 for the newer ranges), the registration
 * group (85 and 65 for Brazil), the registrant, the publication and a check digit. The check digit
 * is the modulus 10 of the ISBN Users' Manual: the first 12 digits weighed alternately 1 and 3,
 * and the digit that brings the sum to a multiple of 10, the same rule as a GTIN-13. Like every
 * other validator, it reads the number alone: the "ISBN" label a book prints in front of it is not
 * part of the value.
 *
 * The 10 digit ISBN, replaced by the 13 digit one in 2007, is not accepted: the current ISBN
 * Users' Manual (7th edition) and the Agência Brasileira do ISBN only define the 13 digit form.
 * A 979-0 number is an ISMN (International Standard Music Number, for printed music), which
 * shares the GS1 prefix 979 but is not an ISBN, so it is rejected. Whether the registration group
 * and the registrant are assigned is not checked here; see `getIsbnInfo`.
 *
 * @see Official: https://www.isbn-international.org/content/isbn-users-manual/29
 * International ISBN Agency, ISBN Users' Manual, 7th edition (2017), Appendix 1, "Calculating the
 * Check Digit": "Each of the first 12 digits of the ISBN is alternately multiplied by 1 and 3.
 * The check digit is equal to 10 minus the remainder resulting from dividing the sum of the
 * weighted products of the first 12 digits by 10 with one exception. If this calculation results
 * in an apparent check digit of 10, the check digit is 0."
 * @see Official: https://www.cblservicos.org.br/isbn/estrutura/
 * Agência Brasileira do ISBN, "Estrutura do ISBN": 13 digits, the check digit "determinado por
 * meio de um cálculo utilizando um algoritmo de módulo 10", and the groups 85 and 65 for Brazil.
 * Its printed example, "ISBN 978-65-89999-01-3", does not carry the check digit that rule gives
 * (0), so it is not a valid ISBN; the examples here use 978-65-89999-01-0.
 * @see Official: https://www.isbn-international.org/export_rangemessage.xml
 * International ISBN Agency, RangeMessage: the EAN.UCC prefix 979 gives the range 0000000-0999999
 * (979-0) a length of 0, so no ISBN starts with it; that range is the ISMN's.
 */
export const isValidIsbn = (value: string): boolean => {
	if (typeof value !== "string") return false;

	if (!FORMAT_REGEX.test(value.trim())) return false;

	const digits = sanitizeToDigits(value);

	if (digits.startsWith(ISMN_PREFIX)) return false;

	return gs1CheckDigit(digits.slice(0, -1)) === Number(digits.at(-1));
};
