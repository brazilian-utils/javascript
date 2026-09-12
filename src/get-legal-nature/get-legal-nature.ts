import { LEGAL_NATURE, MASK_REGEX } from "../is-valid-legal-nature/constants";

/**
 * A Brazilian legal nature (natureza jurídica) entry.
 */
export type LegalNature = {
	/** The 4 digit legal nature code, without formatting. */
	code: string;
	/** The official description in Portuguese, per IBGE/CONCLA. */
	description: string;
};

const lookUp = (code: string): LegalNature | null => {
	if (!Object.hasOwn(LEGAL_NATURE, code)) return null;

	return { code, description: LEGAL_NATURE[code] };
};

/**
 * Looks a Brazilian legal nature (natureza jurídica) code up.
 *
 * @param {string|number} value - The legal nature code to look up, with or without formatting.
 * @returns {LegalNature|null} The matching legal nature entry, or null when the code is unknown
 * or invalid.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 *
 * @example
 * ```typescript
 * getLegalNature("2062"); // { code: "2062", description: "Sociedade Empresária Limitada" }
 * getLegalNature("206-2"); // { code: "2062", description: "Sociedade Empresária Limitada" }
 * getLegalNature("0000"); // null
 * ```
 */
export const getLegalNature = (value: string | number): LegalNature | null => {
	if (typeof value === "number") return lookUp(String(value));

	return typeof value === "string" ? lookUp(value.replace(MASK_REGEX, "")) : null;
};
