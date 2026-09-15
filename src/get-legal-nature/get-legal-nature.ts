import {
	LEGAL_NATURE_CATEGORIES,
	type LegalNatureCategory,
} from "../_internals/constants/legal-nature-categories";
import { LEGAL_NATURE, MASK_REGEX } from "../is-valid-legal-nature/constants";

export type { LegalNatureCategory } from "../_internals/constants/legal-nature-categories";

/**
 * A Brazilian legal nature (natureza jurídica) entry.
 */
export type LegalNature = {
	/** The 4 digit legal nature code, without formatting. */
	code: string;
	/** The official description in Portuguese, per IBGE/CONCLA. */
	description: string;
	/** The CONCLA category the code belongs to, given by its first digit. */
	category: LegalNatureCategory;
};

const lookUp = (code: string): LegalNature | null => {
	if (!Object.hasOwn(LEGAL_NATURE, code)) return null;

	return {
		code,
		description: LEGAL_NATURE[code],
		category: { ...LEGAL_NATURE_CATEGORIES[code[0]] },
	};
};

/**
 * Looks a Brazilian legal nature (natureza jurídica) code up.
 *
 * The usual mask characters (hyphens, dots, whitespace) are stripped before the lookup, from a
 * number as well as from a string, so `getLegalNature(206.2)` resolves like `getLegalNature("206.2")`.
 *
 * No legal nature code starts with a zero, its first digit is the CONCLA category (1 to 5), so
 * nothing is ever padded here: a number and the string of the same digits are read identically,
 * and a value narrower than 4 digits is not a code at all.
 *
 * The entry also carries the CONCLA category of the code, the group the table lists it under,
 * taken from its first digit: 1 Administração Pública, 2 Entidades Empresariais, 3 Entidades
 * sem Fins Lucrativos, 4 Pessoas Físicas and 5 Organizações Internacionais e Outras
 * Instituições Extraterritoriais.
 *
 * @param {string|number} value - The legal nature code to look up, with or without formatting.
 * @returns {LegalNature|null} The matching legal nature entry, or null when the code is unknown
 * or invalid.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 *
 * @example
 * ```typescript
 * getLegalNature("2062");
 * // {
 * //   code: "2062",
 * //   description: "Sociedade Empresária Limitada",
 * //   category: { code: "2", description: "Entidades Empresariais" },
 * // }
 * getLegalNature("206-2")?.code; // "2062"
 * getLegalNature(206.2)?.category.description; // "Entidades Empresariais"
 * getLegalNature("0000"); // null
 * ```
 */
export const getLegalNature = (value: string | number): LegalNature | null => {
	if (typeof value !== "string" && typeof value !== "number") return null;

	return lookUp(String(value).replace(MASK_REGEX, ""));
};
