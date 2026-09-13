import { calculateCnhFirstVerifier } from "../_internals/calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../_internals/calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

/**
 * Generates a valid random CNH (Carteira Nacional de Habilitação, the Brazilian driver's license number).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} A valid 11-digit CNH string without formatting.
 *
 * @example
 * ```typescript
 * generateCnh(); // "00000000119"
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, but no official text publishes the check-digit weights; the algorithm
 * below follows the community reference cited as `Based on:`.
 *
 * Art. 4º § 1º of the same resolution states that the check digit is computed by the DSR system
 * with a "módulo 11" routine in which a remainder of 0 or 1 yields the digit 0. That rounding is
 * not the rule the registry numbers use in practice: the first verifier keeps the remainder
 * itself, so a remainder of 1 yields the digit 1 (which is why `"00000000119"` is a valid CNH).
 * The implementation follows the cited `Based on:` reference, not § 1º.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/
 */
export const generateCnh = (): string => {
	let base = generateRandomNumber(9);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(9);
	}

	const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);
	const secondVerifier = calculateCnhSecondVerifier({ base, decrement });

	return `${base}${firstVerifier}${secondVerifier}`;
};
