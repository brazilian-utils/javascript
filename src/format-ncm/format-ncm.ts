import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Shape a value may be written in while an NCM code is being typed: digits and the mask
 * characters of the `NNNN.NN.NN` presentation, nothing else. Wider than the complete-code
 * shape `isValidNcm` demands, because this formatter masks progressively.
 */
const NCM_MASK_REGEX = /^[\d\s.\-/]*$/;

/** Options of `formatNcm`. */
export type FormatNcmOptions = {
	/** Whether to left pad the value with zeros up to the 8 digits of a complete NCM code (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a NCM (Nomenclatura Comum do Mercosul) code.
 *
 * This is a purely structural transformation, it does not check the code against the
 * official table, use `isValidNcm` for that.
 *
 * With the default `pad: false` the mask is applied progressively, as far as the value goes,
 * which is what an input being typed into needs (`"8471"` stays `"8471"`, `"847130"` becomes
 * `"8471.30"`). With `pad: true` the value is first left padded with zeros to the 8 digits of a
 * complete code, so it always comes back fully masked (`"8471"` gives `"0000.84.71"`).
 * A number is treated exactly like the string of its digits: it is only padded under
 * `pad: true`, so `formatNcm(8471)` gives `"8471"` and `formatNcm(8471, { pad: true })` gives
 * `"0000.84.71"`.
 *
 * A string is only formatted when it holds nothing but digits and the mask characters;
 * anything else (`"abc8471"`) gives `""` instead of having its digits picked out. A number is
 * only formatted when it is a non-negative safe integer, since a sign, a decimal point or a
 * rounded magnitude would otherwise be read as a code the caller never wrote.
 *
 * @param {string|number} value - The NCM code to be formatted.
 * @param {FormatNcmOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `NNNN.NN.NN` pattern, or an empty string
 * when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatNcm("84713012"); // "8471.30.12"
 * formatNcm(84713012); // "8471.30.12"
 * formatNcm("8471"); // "8471" (partial values are masked as far as they go)
 * formatNcm("847130"); // "8471.30"
 * formatNcm("8471", { pad: true }); // "0000.84.71" (padded to 8 digits first)
 * formatNcm("abc8471"); // "" (not a documented form)
 * formatNcm(-84713012); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const formatNcm = (value: string | number, options?: FormatNcmOptions): string => {
	if (!isLookupCode(value)) return "";

	const code = String(value);

	if (!NCM_MASK_REGEX.test(code)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(code),
		pattern: "0000.00.00",
	});
};
