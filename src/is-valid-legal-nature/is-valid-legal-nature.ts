import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { LEGAL_NATURE_CODES } from "./constants";

const CODE_LENGTH = 4;

/**
 * Validates if a Brazilian legal nature (natureza jurídica) code exists.
 *
 * Only the usual mask characters (hyphens, dots, whitespace) are tolerated around the 4
 * digits. Any other character makes the value invalid, so `"2062a"` is rejected instead of
 * being read as `"2062"`.
 *
 * The 8 codes a past revision of the CONCLA table retired are accepted alongside the 92 in force,
 * because they still appear in records filed while they were in force. Use `getLegalNature` to
 * tell the two apart: a retired code comes back with `legacy: true` and the `currentCode` it
 * corresponds to today.
 *
 * @param {string} code - The legal nature code to be validated, with or without formatting.
 * @returns {boolean} True when the code is a known 4 digit legal nature, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLegalNature("2062"); // true
 * isValidLegalNature("206-2"); // true
 * isValidLegalNature("2208"); // true (retired by a past revision, still accepted)
 * isValidLegalNature("2062a"); // false
 * isValidLegalNature("0000"); // false
 * ```
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const isValidLegalNature = (code: string): boolean => {
	if (typeof code !== "string") return false;

	const normalized = code.replace(SEPARATORS_REGEX, "");

	if (normalized.length !== CODE_LENGTH) return false;

	return findCodeIndex(LEGAL_NATURE_CODES, normalized) !== -1;
};
