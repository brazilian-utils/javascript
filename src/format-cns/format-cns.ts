import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCns`. */
export type FormatCnsOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CNS (Cartão Nacional de Saúde) number into the common display groups of 3-4-4-4
 * digits separated by spaces.
 *
 * @param {string|number} value - The CNS value to be formatted. It can be a string or a number.
 * @param {FormatCnsOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @returns {string} The formatted CNS string in the pattern "000 0000 0000 0000".
 *
 * @example
 * ```typescript
 * formatCns("123456789010001"); // "123 4567 8901 0001"
 * formatCns(123456789010001); // "123 4567 8901 0001"
 * formatCns("89010001", { pad: true }); // "000 0000 8901 0001"
 * ```
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 */
export const formatCns = (value: string | number, options?: FormatCnsOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "000 0000 0000 0000",
			});
