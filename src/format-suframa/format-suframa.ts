import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

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
 * `pad: true` to get the zero back. The mask is progressive, as in the other `format` utilities,
 * so an 8 digit value without `pad` is grouped one position early.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
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
 * formatSuframa("10001018"); // "10.0010.18" (8 digits, the mask groups one position early)
 * formatSuframa("10001018", { pad: true }); // "01.0001.018"
 * formatSuframa(-101234567); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e 7.0, Visão Geral, section 8.4, which gives the
 * composition as `SS.NNNN.LLD`.
 */
export const formatSuframa = (value: string | number, options?: FormatSuframaOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: PATTERN,
			})
		: "";
