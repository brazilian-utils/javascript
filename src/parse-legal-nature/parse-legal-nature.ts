import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes legal nature (natureza jurídica) formatting characters and returns only digits.
 *
 * @param {string|number} value - The legal nature code to be parsed.
 * @returns {string} Up to 4 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseLegalNature("206-2"); // "2062"
 * ```
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const parseLegalNature = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
