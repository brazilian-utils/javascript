import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CFOP (Código Fiscal de Operações e Prestações) formatting characters and returns only
 * digits.
 *
 * A code has 4 digits, which is the length the result is capped at; a shorter value passes
 * through as far as it goes. No CFOP code starts with a zero, its first digit is the operation
 * group from 1 to 7, so nothing is ever padded here. Use `getCfop` or `isValidCfop` to look a
 * code up in the official table.
 *
 * @param {string|number} value - The CFOP code to be parsed.
 * @returns {string} Up to 4 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCfop("5.102"); // "5102"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24
 * Consolidated Anexo II of Convênio SINIEF s/nº 1970, which prints the codes in the "N.NNN" form.
 */
export const parseCfop = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
