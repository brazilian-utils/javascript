import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CEST (Código Especificador da Substituição Tributária) formatting characters and
 * returns only digits.
 *
 * A complete code has 7 digits (2 of segment, 3 of item, 2 of specification), which is the
 * length the result is capped at; a shorter value (a code still being typed) passes through as
 * far as it goes and is never left padded, so the leading zero of segments 01 to 09 has to be
 * written out. Use `isValidCest` or `getCest`, which do pad a bare numeric code, to check a code
 * against the official annexes.
 *
 * @param {string|number} value - The CEST to be parsed.
 * @returns {string} Up to 7 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCest("01.001.00"); // "0100100"
 * parseCest("28.999"); // "28999"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18
 * Convênio ICMS 142/18, cláusula sexta, IV (the 7 digits) and Anexos II to XXVI, which print the
 * codes in the "NN.NNN.NN" form.
 */
export const parseCest = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
