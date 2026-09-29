import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CEI (Cadastro Específico do INSS) formatting characters and returns only digits.
 *
 * The numbering has 12 digits, 11 of base and one check digit, which is the length the result is
 * capped at; a shorter value passes through as far as it goes, so the mask of an input still
 * being typed can be stripped with it. Use `isValidCei` to check the number itself.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CEI value to be parsed.
 * @returns {string} Up to 12 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCei("27.729.71181/87"); // "277297118187"
 * parseCei(-249859674386); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but does not print
 * the mask; the mask is the one the reference implementations cited by `isValidCei` agree on.
 */
export const parseCei = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
