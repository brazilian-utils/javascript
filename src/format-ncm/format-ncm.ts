import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

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
 * Like every formatter of this package, the value is read for its digits and masked as far as
 * they go: characters outside the mask are dropped (`formatNcm("abc8471")` gives
 * `"8471"`) and a number is read as the string of its digits, sign and decimal point
 * included (`formatNcm(-84713012)` gives `"8471.30.12"`). This is the input-mask contract of
 * `formatCpf`; use `isValidNcm` to check a code.
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
 * formatNcm("abc8471"); // "8471" (only the digits are read)
 * formatNcm(-84713012); // "8471.30.12"
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const formatNcm = (value: string | number, options?: FormatNcmOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: "0000.00.00",
	});
};
