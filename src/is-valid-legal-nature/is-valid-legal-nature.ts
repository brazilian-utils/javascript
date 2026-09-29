import { LEGAL_NATURE_CODES } from "../_internals/constants/legal-nature-codes";
import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { readLegalNatureCode } from "../_internals/read-legal-nature-code/read-legal-nature-code";

/**
 * Validates if a Brazilian legal nature (natureza jurídica) code exists.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 4
 * digits, or the `NNN-N` mask, with any run of separators (whitespace, `.`, `-` or `/`) between
 * the third and the fourth digit and optional surrounding whitespace. Any other character, or a
 * separator anywhere else, makes the value invalid, so `"2062a"` is rejected instead of being read
 * as `"2062"` and so is `"2-0-6-2"`. A number is only read as a code when it is a non-negative
 * safe integer.
 *
 * The 8 codes a past revision of the CONCLA table retired are accepted alongside the 92 in force,
 * because they still appear in records filed while they were in force. Use `getLegalNature` to
 * tell the two apart: a retired code comes back with `legacy: true` and the `currentCode` it
 * corresponds to today.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @param {string|number} code - The legal nature code to be validated, with or without formatting.
 * @returns {boolean} True when the code is a known 4 digit legal nature, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLegalNature("2062"); // true
 * isValidLegalNature(2062); // true
 * isValidLegalNature("206-2"); // true
 * isValidLegalNature("2208"); // true (retired by a past revision, still accepted)
 * isValidLegalNature("2062a"); // false
 * isValidLegalNature("2-0-6-2"); // false (a separator after the third digit only)
 * isValidLegalNature("0000"); // false
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const isValidLegalNature = (code: string | number): boolean =>
	findCodeIndex(LEGAL_NATURE_CODES, readLegalNatureCode(code)) !== -1;
