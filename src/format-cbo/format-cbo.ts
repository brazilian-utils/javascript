import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCbo`. */
export type FormatCboOptions = {
	/** Whether to left pad the value with zeros up to the 6 digits of a complete occupation code (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CBO (Classificação Brasileira de Ocupações) code into the `NNNN-NN` mask the
 * classification prints.
 *
 * This is a purely structural transformation, it does not check the code against the official
 * table, use `isValidCbo` for that.
 *
 * With the default `pad: false` the mask is applied progressively, as far as the value goes,
 * which is what an input being typed into needs (`"21"` stays `"21"`, `"21240"` becomes
 * `"2124-0"`). With `pad: true` the value is first left padded with zeros to the 6 digits of a
 * complete code, so it always comes back fully masked (`"10205"` gives `"0102-05"`). A number is
 * treated exactly like the string of its digits: it is only padded under `pad: true`, so
 * `formatCbo(10205)` gives `"1020-5"` and `formatCbo(10205, { pad: true })` gives `"0102-05"`.
 *
 * Like every formatter of this package, a string is read for its digits and masked as far as
 * they go: characters outside the mask are dropped (`formatCbo("abc212405")` gives `"2124-05"`).
 * A number is only read when it is a non-negative safe integer: its sign and decimal point are
 * not mask characters, so a negative, fractional, not finite or unsafe number gives an empty
 * string (`formatCbo(-212405)` gives `""`). Use `isValidCbo` to check a code.
 *
 * @param {string|number} value - The CBO code to be formatted.
 * @param {FormatCboOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `NNNN-NN` pattern, or an empty string when there is
 * nothing to format.
 *
 * @example
 * ```typescript
 * formatCbo("212405"); // "2124-05"
 * formatCbo(212405); // "2124-05"
 * formatCbo("21240"); // "2124-0" (partial values are masked as far as they go)
 * formatCbo("10205", { pad: true }); // "0102-05" (padded to 6 digits first)
 * formatCbo("abc212405"); // "2124-05" (only the digits are read)
 * formatCbo(-212405); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://cbo.mte.gov.br/cbosite/pages/downloads.jsf
 * "Estrutura CBO (CSV)", the CBO 2002 tables the Ministério do Trabalho e Emprego publishes,
 * where the codes are printed as `NNNN-NN`.
 */
export const formatCbo = (value: string | number, options?: FormatCboOptions): string => {
	if (!isLookupCode(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: "0000-00",
	});
};
