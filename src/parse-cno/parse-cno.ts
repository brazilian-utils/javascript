import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNO (Cadastro Nacional de Obras) formatting characters and returns only digits.
 *
 * The CNO replaced the CEI for construction works and kept its 12 digit numbering, so the result
 * is capped at the same length; a shorter value passes through as far as it goes. Use
 * `isValidCno` to check the number itself.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNO value to be parsed.
 * @returns {string} Up to 12 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCno("11.113.01373/68"); // "111130137368"
 * parseCno(-401800097960); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but does not print
 * the mask; the mask is the one the reference implementations cited by `isValidCno` agree on.
 */
export const parseCno = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
