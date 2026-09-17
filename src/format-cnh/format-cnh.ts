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
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, which is the layout this mask reproduces; no official text publishes
 * the check-digit weights used to compute them.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 */
export const formatCnh = (value: string | number, options?: FormatCnhOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "000000000-00",
			});
