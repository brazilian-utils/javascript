import { CERTIDAO_LENGTH } from "../_internals/constants/certidao";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes the formatting of the matrícula of a certidão de registro civil and returns only
 * digits.
 *
 * The matrícula has 32 digits, which is the length the result is capped at; a shorter value
 * passes through as far as it goes, so the mask of an input still being typed can be stripped
 * with it. This only takes the mask off: use `isValidCertidao` to check the matrícula and
 * `getCertidaoInfo` to read its fields.
 *
 * @param {string|number} value - The matrícula value to be parsed.
 * @returns {string} Up to 32 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCertidao("104539 01 55 2013 1 00012 021 0000123 21");
 * // "10453901552013100012021000012321"
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Código Nacional de Normas da Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento
 * CNJ nº 149/2023), art. 473: the in-force 6 + 2 + 2 + 4 + 1 + 5 + 3 + 7 + 2 layout of the 32
 * digit matrícula.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1310
 * Provimento CNJ nº 3, de 17/11/2009, art. 7º, where that matrícula first got the same digit
 * structure (revoked; historical).
 */
export const parseCertidao = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, CERTIDAO_LENGTH);
