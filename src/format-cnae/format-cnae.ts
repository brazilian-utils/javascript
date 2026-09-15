import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCnae`. */
export type FormatCnaeOptions = {
	/** Whether to left pad the value with zeros up to the 7 digits of a complete subclass code (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CNAE (Classificação Nacional de Atividades Econômicas) subclass code.
 *
 * This is a purely structural transformation, it does not check the code against the
 * official table, use `isValidCnae` for that.
 *
 * With the default `pad: false` the mask is applied progressively, as far as the value goes,
 * which is what an input being typed into needs (`"62"` stays `"62"`, `"62015"` becomes
 * `"6201-5"`). With `pad: true` the value is first left padded with zeros to the 7 digits of a
 * complete subclass code, so it always comes back fully masked (`"62"` gives `"0000-0/62"`).
 * A number is treated exactly like the string of its digits: it is only padded under
 * `pad: true`, so `formatCnae(111301)` gives `"1113-0/1"` and `formatCnae(111301, { pad: true })`
 * gives `"0111-3/01"`.
 *
 * Like every formatter of this package, the value is read for its digits and masked as far as
 * they go: characters outside the mask are dropped (`formatCnae("abc6201501")` gives
 * `"6201-5/01"`) and a number is read as the string of its digits, sign and decimal point
 * included (`formatCnae(-6201501)` gives `"6201-5/01"`). This is the input-mask contract of
 * `formatCpf`; use `isValidCnae` to check a code.
 *
 * @param {string|number} value - The CNAE code to be formatted.
 * @param {FormatCnaeOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `NNNN-N/NN` pattern, or an empty string
 * when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCnae("6201501"); // "6201-5/01"
 * formatCnae(6201501); // "6201-5/01"
 * formatCnae("62"); // "62" (partial values are masked as far as they go)
 * formatCnae("62015"); // "6201-5"
 * formatCnae("62", { pad: true }); // "0000-0/62" (padded to 7 digits first)
 * formatCnae("abc6201501"); // "6201-5/01" (only the digits are read)
 * formatCnae(-6201501); // "6201-5/01"
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 */
export const formatCnae = (value: string | number, options?: FormatCnaeOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: "0000-0/00",
	});
};
