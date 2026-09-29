import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes legal nature (natureza jurídica) formatting characters and returns only digits.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @param {string|number} value - The legal nature code to be parsed.
 * @returns {string} Up to 4 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseLegalNature("206-2"); // "2062"
 * parseLegalNature(206.2); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const parseLegalNature = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
