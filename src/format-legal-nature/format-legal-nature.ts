import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Formats a Brazilian legal nature (natureza jurídica) code.
 *
 * @param {string|number} value - The legal nature code to be formatted.
 * @returns {string} The formatted code, or an empty string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatLegalNature("2062"); // "206-2"
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const formatLegalNature = (value: string | number): string =>
	isNullish(value)
		? ""
		: format({
				value: sanitizeToDigits(value),
				pattern: "000-0",
			});
