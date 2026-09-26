import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNH (Carteira Nacional de Habilitação) formatting characters and returns only digits.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNH to be parsed.
 * @returns {string} Up to 11 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCnh("123456789-00"); // "12345678900"
 * parseCnh(2 ** 53); // "" (not a non-negative safe integer)
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, which is the layout this parser caps at; no official text publishes
 * the check-digit weights used to compute them.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 */
export const parseCnh = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
