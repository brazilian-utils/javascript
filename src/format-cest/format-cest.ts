import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCest`. */
export type FormatCestOptions = {
	/** Whether to left pad the value with zeros up to the 7 digits of a complete CEST (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CEST (Código Especificador da Substituição Tributária) in the `NN.NNN.NN` form the
 * annexes of Convênio ICMS 142/18 print: segment, item of the segment and specification of the
 * item.
 *
 * This is a purely structural transformation, it does not check the code against the annexes,
 * use `isValidCest` for that.
 *
 * With the default `pad: false` the mask is applied progressively, as far as the value goes,
 * which is what an input being typed into needs (`"01"` stays `"01"`, `"01001"` becomes
 * `"01.001"`). With `pad: true` the value is first left padded with zeros to the 7 digits of a
 * complete code, so it always comes back fully masked (`"100100"` gives `"01.001.00"`). A number
 * is treated exactly like the string of its digits: it is only padded under `pad: true`, so
 * `formatCest(100100)` gives `"10.010.0"` and `formatCest(100100, { pad: true })` gives
 * `"01.001.00"`.
 *
 * Like every formatter of this package, the value is read for its digits and masked as far as
 * they go: characters outside the mask are dropped (`formatCest("abc0100100")` gives
 * `"01.001.00"`) and a number is read as the string of its digits, sign and decimal point
 * included. This is the input-mask contract of `formatCpf`; use `isValidCest` to check a code.
 *
 * @param {string|number} value - The CEST to be formatted.
 * @param {FormatCestOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `NN.NNN.NN` pattern, or an empty string when
 * there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCest("0100100"); // "01.001.00"
 * formatCest(2899900); // "28.999.00"
 * formatCest("01001"); // "01.001" (partial values are masked as far as they go)
 * formatCest(100100, { pad: true }); // "01.001.00" (padded to 7 digits first)
 * formatCest("abc0100100"); // "01.001.00" (only the digits are read)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18
 * Convênio ICMS 142/18, cláusula sexta, IV (the 7 digits and their three groups) and Anexos II
 * to XXVI, which print the codes in the "NN.NNN.NN" form.
 */
export const formatCest = (value: string | number, options?: FormatCestOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: "00.000.00",
	});
};
