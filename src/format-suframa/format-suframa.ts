import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatSuframa`. */
export type FormatSuframaOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats an Inscrição SUFRAMA with the `SS.NNNN.LLD` mask: sector of activity, sequential
 * number, locality and check digit.
 *
 * An 8 digit value is a number whose sector code lost its leading zero, so format it with
 * `pad: true` to get the zero back.
 *
 * @param {string|number} value - The Inscrição SUFRAMA to be formatted. It can be a string or a number.
 * @param {FormatSuframaOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @returns {string} The formatted Inscrição SUFRAMA as a string.
 *
 * @example
 * ```typescript
 * formatSuframa("123456789"); // "12.3456.789"
 * formatSuframa(123456789); // "12.3456.789"
 * formatSuframa("10001018", { pad: true }); // "01.0001.018"
 * ```
 *
 * @see Official: https://portal.fazenda.sp.gov.br/servicos/nfce/Downloads/Manual_de_Orientacao_Contribuinte_v_6.pdf
 * Manual de Orientação do Contribuinte da NF-e 6.0, Anexo XII.01, which gives the composition
 * as `SS.NNNN.LLD`.
 */
export const formatSuframa = (value: string | number, options?: FormatSuframaOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "00.0000.000",
			});
