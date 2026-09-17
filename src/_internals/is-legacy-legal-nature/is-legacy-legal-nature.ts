import { LEGACY_LEGAL_NATURE } from "../../is-valid-legal-nature/constants";

/**
 * Checks whether a legal nature (natureza jurídica) code is one a past revision of the CONCLA
 * table retired: still accepted by `isValidLegalNature`, but left out of the listings and never
 * generated.
 *
 * @param {string} code - The 4 digit legal nature code.
 * @returns {boolean} True when the code is a retired one.
 *
 * @example
 * ```typescript
 * isLegacyLegalNature("2076"); // true
 * isLegacyLegalNature("2062"); // false
 * ```
 */
export const isLegacyLegalNature = (code: string): boolean =>
	Object.hasOwn(LEGACY_LEGAL_NATURE, code);
