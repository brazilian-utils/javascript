import { type LegalNature } from "../../get-legal-nature/get-legal-nature";
import { LEGACY_LEGAL_NATURE } from "../../is-valid-legal-nature/constants";
import { LEGAL_NATURE_CATEGORIES } from "../constants/legal-nature-categories";

/**
 * Builds the entry of a code known to be in `LEGAL_NATURE`, tagging it as legacy, with the code it
 * corresponds to today, when a past revision of the CONCLA table retired it.
 *
 * @param {string} code - The 4 digit legal nature code, without formatting.
 * @param {string} description - The description `LEGAL_NATURE` holds for the code.
 * @returns {LegalNature} The legal nature entry of the code.
 *
 * @example
 * ```typescript
 * buildLegalNature("2062", "Sociedade Empresária Limitada").legacy; // false
 * buildLegalNature("2208", "Entidade Binacional Itaipu").legacy; // true
 * ```
 */
export const buildLegalNature = (code: string, description: string): LegalNature => {
	const entry = {
		code,
		description,
		category: { ...LEGAL_NATURE_CATEGORIES[code[0]] },
	};

	return Object.hasOwn(LEGACY_LEGAL_NATURE, code)
		? { ...entry, legacy: true, currentCode: LEGACY_LEGAL_NATURE[code] }
		: { ...entry, legacy: false };
};
