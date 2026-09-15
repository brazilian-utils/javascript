import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNO (Cadastro Nacional de Obras) formatting characters and returns only digits.
 *
 * The CNO replaced the CEI for construction works and kept its 12 digit numbering, so the result
 * is capped at the same length; a shorter value passes through as far as it goes. Use
 * `isValidCno` to check the number itself.
 *
 * @param {string|number} value - The CNO value to be parsed.
 * @returns {string} Up to 12 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCno("11.113.01373/68"); // "111130137368"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but does not print
 * the mask; the mask is the one the reference implementations cited by `isValidCno` agree on.
 */
export const parseCno = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
