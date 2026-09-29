import { calculateRenavamCheckDigit } from "../_internals/calculate-renavam-check-digit/calculate-renavam-check-digit";
import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const RENAVAM_LENGTH = 11;

const BASE_LENGTH = 10;

const FORMAT_REGEX = /^\d{9}$|^\d{11}$/;

/**
 * Validates if a RENAVAM (Registro Nacional de Veículos Automotores) is valid.
 *
 * RENAVAM can be in two formats:
 * - Old format: 9 digits (will be padded to 11 with zeros)
 * - New format: 11 digits
 *
 * The validation uses a checksum algorithm based on modulo 11.
 *
 * Spaces, dots, hyphens and slashes are ignored, so every punctuated form of a RENAVAM is accepted, but
 * any other character, a letter in particular, makes the value invalid. A registration whose
 * digits are all the same (`"00000000000"`) is rejected as well, matching both references below.
 * A number is only read as a RENAVAM when it is a non-negative safe integer.
 *
 * @param {string} renavam - The RENAVAM value to be validated.
 * @returns {boolean} True if the RENAVAM is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidRenavam("639884962"); // true (9 digits, old format)
 * isValidRenavam("00639884962"); // true (11 digits, new format)
 * isValidRenavam("0063988.4962"); // true (dots and hyphens are ignored)
 * isValidRenavam("12345678901"); // false (invalid checksum)
 * isValidRenavam("00000000000"); // false (repeated digits)
 * isValidRenavam("ab00639884962"); // false (invalid format)
 * isValidRenavam(-639884962); // false (not a non-negative safe integer)
 * ```
 *
 * Portaria DENATRAN nº 27, de 25 de janeiro de 2013, art. 1º, gives the Portaria DENATRAN nº
 * 03/86, art. 3º, its wording in force: the Código RENAVAM is "composto de 11 (onze) dígitos",
 * and "possui 10 dígitos e um dígito verificador, calculado através do módulo 11, peso 9". Read
 * as the usual módulo 11 with weights 2 to 9 from the right, that gives 3, 2, 9, 8, 7, 6, 5, 4, 3
 * and 2 over the ten base digits, the weights used here; the portaria does not write them out
 * nor say what a remainder of 0, 1 or 10 turns into, so that part follows the community
 * references cited as `Based on:`. Nor does it say how a 9 digit code issued before 1 April 2013
 * is read in 11: padding it with zeros on the left is market practice.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2013/portaria0272013.pdf
 * Portaria DENATRAN nº 27/2013, art. 1º: "10 dígitos e um dígito verificador, calculado através do
 * módulo 11, peso 9"; art. 2º: the 11 digit numbering from 1 April 2013.
 * @see Based on: https://github.com/klawdyo/validation-br/blob/main/src/renavam.ts
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/renavam.py
 */
export const isValidRenavam = (renavam: string | number): boolean => {
	if (!isLookupCode(renavam)) return false;

	const digits = renavam.toString().replace(SEPARATORS_REGEX, "");

	if (!FORMAT_REGEX.test(digits)) return false;

	const paddedDigits = digits.padStart(RENAVAM_LENGTH, "0");

	if (isRepeatedDigits(paddedDigits)) return false;

	const expectedDigit = calculateRenavamCheckDigit(paddedDigits.slice(0, BASE_LENGTH));

	const actualDigit = Number.parseInt(paddedDigits.charAt(BASE_LENGTH), 10);

	return expectedDigit === actualDigit;
};
