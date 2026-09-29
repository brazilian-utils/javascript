import { calculateCnhFirstVerifier } from "../_internals/calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../_internals/calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const FORMAT_REGEX = /^\d{11}$/;

/**
 * Validates if a CNH (Carteira Nacional de Habilitação, the Brazilian driver's license number) is valid.
 *
 * Spaces, dots, hyphens and slashes are ignored, so every punctuated form of a CNH is accepted, but any
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
 * Art. 4º § 1º of the same resolution has the DSR system compute "O dígito verificador" with a
 * "módulo 11" routine in which a remainder of 0 or 1 yields the digit 0. It does not say which
 * number it applies to: in the singular, right after inciso II, the Número do Espelho da CNH (9
 * characters plus 1 check digit, the only number of the article with a single one), it reads
 * best as the rule of that digit, but its wording is generic, and it gives no weights. So it is
 * not a source for the 2 check digits of the registry number, whose first verifier keeps the
 * remainder itself, so a remainder of 1 yields the digit 1 (which is why `"00000000119"` is
 * accepted). Resoluções CONTRAN nº 976/2022, nº 998/2023 and nº 1.006/2024 amend Resolução nº
 * 886/2021, but none of them touches art. 4º.
 *
 * Resolução CONTRAN nº 1.020/2025, the newer habilitação norm, repeats the layout in its art. 10
 * ("nove caracteres e dois dígitos verificadores") without any check digit rule, and its art. 140
 * does not revoke Resolução nº 886/2021, so art. 4º § 1º of the 886 stays the only official text
 * on the calculation.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * Resolução CONTRAN nº 886/2021, art. 4º, I: the Número do Registro Nacional, of "9 (nove)
 * caracteres" and "2 (dois) dígitos verificadores de segurança"; the Número do Espelho da CNH of
 * the same article has 9 characters and 1 check digit, the one § 1º most likely computes.
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10202025.pdf
 * Resolução CONTRAN nº 1.020, de 1º de dezembro de 2025 (DOU of 09/12/2025), art. 10: the same
 * three numbers, the registro nacional "composto de nove caracteres e dois dígitos verificadores",
 * with no "módulo 11" rule and no weights; its art. 140 does not revoke Resolução nº 886/2021.
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
