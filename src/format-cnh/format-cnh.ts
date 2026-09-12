import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCnh`. */
export type FormatCnhOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a Brazilian CNH (Carteira Nacional de Habilitação) number.
 *
 * @param {string|number} value - The CNH number to be formatted.
 * @param {FormatCnhOptions} [options] - Optional options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros.
 * @returns {string} The formatted CNH, or an empty string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCnh("12345678900"); // "123456789-00"
 * formatCnh("8900", { pad: true }); // "000000089-00"
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 */
export const formatCnh = (value: string | number, options?: FormatCnhOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "000000000-00",
			});
