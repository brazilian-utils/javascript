import { calculateCnhFirstVerifier } from "../_internals/calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../_internals/calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates if a CNH (Carteira Nacional de Habilitação, the Brazilian driver's license number) is valid.
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
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, but no official text publishes the check-digit weights; the algorithm
 * below follows the community reference cited as `Based on:`.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/
 */
export const isValidCnh = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

	// Stryker disable next-line MethodExpression: the verifier helpers only read indices 0-8.
	const base = digits.slice(0, 9);

	const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);

	if (firstVerifier !== digits.charCodeAt(9) - 48) return false;

	const secondVerifier = calculateCnhSecondVerifier({ base, decrement });

	return secondVerifier === digits.charCodeAt(10) - 48;
};
