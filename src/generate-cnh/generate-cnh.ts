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
 * Art. 4º § 1º of the same resolution has the DSR system compute "O dígito verificador" with a
 * "módulo 11" routine in which a remainder of 0 or 1 yields the digit 0. It does not say which
 * number it applies to: in the singular, right after inciso II, the Número do Espelho da CNH (9
 * characters plus 1 check digit, the only number of the article with a single one), it reads
 * best as the rule of that digit, but its wording is generic, and it gives no weights. So it is
 * not a source for the 2 check digits of the registry number, whose first verifier keeps the
 * remainder itself, so a remainder of 1 yields the digit 1 (which is why `"00000000119"` is
 * a valid CNH). Resoluções CONTRAN nº 976/2022, nº 998/2023 and nº 1.006/2024 amend Resolução nº
 * 886/2021, but none of them touches art. 4º.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * Resolução CONTRAN nº 886/2021, art. 4º, I: the Número do Registro Nacional, of "9 (nove)
 * caracteres" and "2 (dois) dígitos verificadores de segurança"; the Número do Espelho da CNH of
 * the same article has 9 characters and 1 check digit, the one § 1º most likely computes.
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
