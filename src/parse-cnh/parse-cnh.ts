import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNH (Carteira Nacional de Habilitação) formatting characters and returns only digits.
 *
 * @param {string|number} value - The CNH to be parsed.
 * @returns {string} Up to 11 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCnh("123456789-00"); // "12345678900"
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, which is the layout this parser caps at; no official text publishes
 * the check-digit weights used to compute them.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 */
export const parseCnh = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
