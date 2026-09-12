import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	CAEPF_BASE_LENGTH,
	CAEPF_CHECK_DIGITS_OFFSET,
	CAEPF_FIRST_WEIGHTS,
	CAEPF_FORMAT_REGEX,
	CAEPF_LENGTH,
	CAEPF_SECOND_WEIGHTS,
} from "./constants";

const getCheckDigit = (base: string, weights: number[]): number =>
	(generateChecksum({ base, weight: weights }) % 11) % 10;

/**
 * Validates a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number.
 *
 * The CAEPF replaced the CEI for individuals who hire employees, such as rural producers and
 * notary officials. It has 14 digits printed as "000.000.000/000-00": the 9 digit CPF base of
 * the holder, a 3 digit sequence for the holder's several registrations and 2 check digits.
 * Both check digits use the modulus 11 of the CNPJ, weights cycling from 2 to 9 from the right,
 * with a remainder of 10 read as 0. The pair is then shifted by 12, wrapping around 100, so a
 * CAEPF whose plain modulus 11 digits would be 72 is printed with 84.
 *
 * @param {string|number} value - The CAEPF value to be validated.
 * @returns {boolean} True if the CAEPF is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCaepf("293.118.610/001-84"); // true
 * isValidCaepf("41142260000101"); // true
 * isValidCaepf(29311861000184); // true
 * isValidCaepf("29311861000185"); // false (invalid check digits)
 * isValidCaepf("00000000000000"); // false (repeated digits)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf
 * @see Based on: http://ghiorzi.org/DVnew.htm Description of the CAEPF layout and of the
 * shift of 12 applied to the check digit pair.
 * @see Based on: https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts
 * Reference implementation agreeing on the weights and on the shift.
 * @see Based on: https://github.com/Casilhero/brazilian-validators/blob/main/src/Validators/Caepf.php
 * Third reference implementation.
 */
export const isValidCaepf = (value: string | number): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== CAEPF_LENGTH) return false;

	if (!CAEPF_FORMAT_REGEX.test(String(value).trim())) return false;

	if (isRepeatedDigits(digits)) return false;

	const base = digits.slice(0, CAEPF_BASE_LENGTH);
	const first = getCheckDigit(base, CAEPF_FIRST_WEIGHTS);
	const second = getCheckDigit(`${base}${first}`, CAEPF_SECOND_WEIGHTS);
	const expected = (first * 10 + second + CAEPF_CHECK_DIGITS_OFFSET) % 100;

	return Number(digits.slice(CAEPF_BASE_LENGTH)) === expected;
};
