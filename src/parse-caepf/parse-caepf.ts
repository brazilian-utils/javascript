import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CAEPF (Cadastro de Atividade Econômica da Pessoa Física) formatting characters and
 * returns only digits.
 *
 * The number has 14 digits, 12 of base plus the two check digits, which is the length the result
 * is capped at; a shorter value passes through as far as it goes. Use `isValidCaepf` to check the
 * number itself.
 *
 * @param {string|number} value - The CAEPF value to be parsed.
 * @returns {string} Up to 14 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCaepf("293.118.610/001-84"); // "29311861000184"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf
 * The registry's own page at the Receita Federal, which describes the cadastro but does not print
 * the mask; the mask is the one the sources cited by `isValidCaepf` agree on.
 */
export const parseCaepf = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
