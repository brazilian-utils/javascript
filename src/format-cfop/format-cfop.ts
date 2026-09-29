import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCfop`. */
export type FormatCfopOptions = {
	/** Whether to left pad the value with zeros up to the 4 digits of a complete CFOP (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CFOP (Código Fiscal de Operações e Prestações) code into the `N.NNN` form the annex
 * prints.
 *
 * This is a purely structural transformation, it does not check the code against the official
 * table, use `isValidCfop` for that.
 *
 * With the default `pad: false` the mask is applied progressively, as far as the value goes,
 * which is what an input being typed into needs (`"5"` stays `"5"`, `"51"` becomes `"5.1"`).
 * With `pad: true` the value is first left padded with zeros to the 4 digits of a complete code,
 * so it always comes back fully masked (`"102"` gives `"0.102"`). No CFOP starts with a zero, so
 * the padding only serves a caller that wants a fixed width. A number is treated exactly like
 * the string of its digits.
 *
 * Like every formatter of this package, a string is read for its digits and masked as far as
 * they go: characters outside the mask are dropped (`formatCfop("abc5102")` gives `"5.102"`). A
 * number is only read when it is a non-negative safe integer: its sign and decimal point are not
 * mask characters, so a negative, fractional, not finite or unsafe number gives an empty string
 * (`formatCfop(-5102)` gives `""`). Use `isValidCfop` to check a code.
 *
 * @param {string|number} value - The CFOP code to be formatted.
 * @param {FormatCfopOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `N.NNN` pattern, or an empty string when there is
 * nothing to format.
 *
 * @example
 * ```typescript
 * formatCfop("5102"); // "5.102"
 * formatCfop(5102); // "5.102"
 * formatCfop("51"); // "5.1" (partial values are masked as far as they go)
 * formatCfop("102", { pad: true }); // "0.102" (padded to 4 digits first)
 * formatCfop("abc5102"); // "5.102" (only the digits are read)
 * formatCfop(-5102); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24
 * Consolidated Anexo II of Convênio SINIEF s/nº 1970, which prints the codes in the "N.NNN" form.
 */
export const formatCfop = (value: string | number, options?: FormatCfopOptions): string => {
	if (!isLookupCode(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: "0.000",
	});
};
