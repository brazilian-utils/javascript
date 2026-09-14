import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CEI (Cadastro Específico do INSS) formatting characters and returns only digits.
 *
 * The numbering has 12 digits, 11 of base and one check digit, which is the length the result is
 * capped at; a shorter value passes through as far as it goes, so the mask of an input still
 * being typed can be stripped with it. Use `isValidCei` to check the number itself.
 *
 * @param {string|number} value - The CEI value to be parsed.
 * @returns {string} Up to 12 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCei("27.729.71181/87"); // "277297118187"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but does not print
 * the mask; the mask is the one the reference implementations cited by `isValidCei` agree on.
 */
export const parseCei = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
