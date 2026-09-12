import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatPis`. */
export type FormatPisOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a PIS (Programa de Integração Social) number according to the specified pattern.
 *
 * @param {string|number} value - The PIS number to be formatted. It can be a string or a number.
 * @param {FormatPisOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @returns {string} The formatted PIS number as a string.
 *
 * @example
 * ```typescript
 * formatPis("12345678901"); // "123.45678.90-1"
 * formatPis(12345678901); // "123.45678.90-1"
 * formatPis("123456789", { pad: true }); // "001.23456.78-9"
 * ```
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 */
export const formatPis = (value: string | number, options?: FormatPisOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "000.00000.00-0",
			});
