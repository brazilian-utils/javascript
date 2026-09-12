import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatProcessoJuridico`. */
export type FormatProcessoJuridicoOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a legal process number (processo jurídico) according to a specific pattern.
 *
 * @param {string|number} value - The legal process number to be formatted. It can be a string or a number.
 * @param {FormatProcessoJuridicoOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, the value will be padded with leading zeros if necessary.
 * @returns {string} The formatted legal process number as a string.
 *
 * @example
 * ```typescript
 * formatProcessoJuridico("00020802520125150049"); // "0002080-25.2012.5.15.0049"
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119 Resolução CNJ nº 65/2008
 */
export const formatProcessoJuridico = (
	value: string | number,
	options?: FormatProcessoJuridicoOptions,
): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "0000000-00.0000.0.00.0000",
			});
