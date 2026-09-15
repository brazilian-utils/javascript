import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatLegalNature`. */
export type FormatLegalNatureOptions = {
	/** Whether to left pad the value with zeros up to the 4 digits of a complete code (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a Brazilian legal nature (natureza jurídica) code.
 *
 * Like every formatter of this package, the value is read for its digits and masked as far as
 * they go (`"206"` stays `"206"`, `"2062"` becomes `"206-2"`); with `pad: true` it is first left
 * padded with zeros to the 4 digits of a complete code. Use `isValidLegalNature` to check a code.
 *
 * @param {string|number} value - The legal nature code to be formatted.
 * @param {FormatLegalNatureOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code, or an empty string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatLegalNature("2062"); // "206-2"
 * formatLegalNature(2062); // "206-2"
 * formatLegalNature("206"); // "206" (partial values are masked as far as they go)
 * formatLegalNature("62", { pad: true }); // "006-2"
 * ```
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const formatLegalNature = (
	value: string | number,
	options?: FormatLegalNatureOptions,
): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "000-0",
			});
