import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
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
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CFOP code to be parsed.
 * @returns {string} Up to 4 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCfop("5.102"); // "5102"
 * parseCfop(51.02); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24
 * Consolidated Anexo II of Convênio SINIEF s/nº 1970, which prints the codes in the "N.NNN" form.
 */
export const parseCfop = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
