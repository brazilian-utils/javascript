import { LEGAL_NATURE, MASK_REGEX } from "./constants";

/**
 * Validates if a Brazilian legal nature (natureza jurídica) code exists.
 *
 * Only the usual mask characters (hyphens, dots, whitespace) are tolerated around the 4
 * digits. Any other character makes the value invalid, so `"2062a"` is rejected instead of
 * being read as `"2062"`.
 *
 * @param {string} code - The legal nature code to be validated, with or without formatting.
 * @returns {boolean} True when the code is a known 4 digit legal nature, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLegalNature("2062"); // true
 * isValidLegalNature("206-2"); // true
 * isValidLegalNature("2062a"); // false
 * isValidLegalNature("0000"); // false
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 */
export const isValidLegalNature = (code: string): boolean => {
	if (typeof code !== "string") return false;

	const normalized = code.replace(MASK_REGEX, "");

	return Object.hasOwn(LEGAL_NATURE, normalized);
};
