import { calculateCnhFirstVerifier } from "../_internals/calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../_internals/calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const FORMAT_REGEX = /^\d{11}$/;

/**
 * Validates if a CNH (Carteira Nacional de Habilitação, the Brazilian driver's license number) is valid.
 *
 * Spaces, dots and hyphens are ignored, so every punctuated form of a CNH is accepted, but any
 * other character, a letter in particular, makes the value invalid.
 *
 * @param {string} value - The CNH value to be validated.
 * @returns {boolean} True if the CNH is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnh("00000000119"); // true
 * isValidCnh("000000001-19"); // true
 * isValidCnh("11111111111"); // false (repeated digits)
 * isValidCnh("12345678901"); // false (invalid checksum)
 * isValidCnh("ab00000000119"); // false (invalid format)
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, but no official text publishes the check-digit weights; the algorithm
 * below follows the community reference cited as `Based on:`.
 *
 * Art. 4º § 1º of the same resolution states that the check digit is computed by the DSR system
 * with a "módulo 11" routine in which a remainder of 0 or 1 yields the digit 0. That rounding is
 * not the rule the registry numbers use in practice: the first verifier keeps the remainder
 * itself, so a remainder of 1 yields the digit 1 (which is why `"00000000119"` is accepted). The
 * implementation follows the cited `Based on:` reference, not § 1º.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/
 */
export const isValidCnh = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = value.replace(SEPARATORS_REGEX, "");

	if (!FORMAT_REGEX.test(digits) || isRepeatedDigits(digits)) return false;

	// Stryker disable next-line MethodExpression: the verifier helpers only read indices 0-8.
	const base = digits.slice(0, 9);

	const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);

	if (firstVerifier !== digits.charCodeAt(9) - 48) return false;

	const secondVerifier = calculateCnhSecondVerifier({ base, decrement });

	return secondVerifier === digits.charCodeAt(10) - 48;
};
