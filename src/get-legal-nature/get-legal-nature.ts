import {
	LEGAL_NATURE_CATEGORIES,
	type LegalNatureCategory,
} from "../_internals/constants/legal-nature-categories";
import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { LEGACY_LEGAL_NATURE, LEGAL_NATURE } from "../is-valid-legal-nature/constants";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";

export type { LegalNatureCategory } from "../_internals/constants/legal-nature-categories";

/**
 * A Brazilian legal nature (natureza jurídica) entry.
 *
 * `legacy` discriminates the entry: `false` for the 92 codes of the CONCLA 2021 table, the ones
 * in force, and `true` for the 8 a past revision of the table retired, which carry the extra
 * `currentCode` field.
 */
export type LegalNature = {
	/** The 4 digit legal nature code, without formatting. */
	code: string;
	/** The official description in Portuguese, per IBGE/CONCLA. */
	description: string;
	/** The CONCLA category the code belongs to, given by its first digit. */
	category: LegalNatureCategory;
} & (
	| {
			/** `false` when the code is one of the 92 the CONCLA 2021 table publishes. */
			legacy: false;
	  }
	| {
			/** `true` when a past revision of the CONCLA table retired the code. */
			legacy: true;
			/**
			 * The code this legacy one corresponds to today, per the CONCLA correspondence
			 * spreadsheets, or `null` when the revision that retired it published no successor.
			 */
			currentCode: string | null;
	  }
);

/**
 * Builds the entry of a code known to be in `LEGAL_NATURE`, tagging it as legacy, with the code it
 * corresponds to today, when a past revision of the CONCLA table retired it.
 *
 * @param {string} code - The 4 digit legal nature code, without formatting.
 * @param {string} description - The description `LEGAL_NATURE` holds for the code.
 * @returns {LegalNature} The legal nature entry of the code.
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

/**
 * Looks a Brazilian legal nature (natureza jurídica) code up.
 *
 * The usual mask characters (hyphens, dots, whitespace) are stripped from a string before the
 * lookup, so `getLegalNature("206.2")` resolves like `getLegalNature("206-2")`. A number is only
 * read as a code when it is a non-negative safe integer: its sign and its decimal point are not
 * mask characters, so `getLegalNature(-2062)` and `getLegalNature(206.2)` return `null` instead
 * of being read as `2062`.
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
 * A code a past revision of the table retired is still looked up, because it keeps appearing in
 * records filed while it was in force, and comes back with `legacy: true` and the `currentCode`
 * it corresponds to today per the CONCLA correspondence spreadsheets (`null` when the revision
 * that retired it published no successor). The 92 codes in force have `legacy: false` and no
 * `currentCode`.
 *
 * @param {string|number} value - The legal nature code to look up, with or without formatting.
 * @returns {LegalNature|null} The matching legal nature entry, or null when the code is unknown
 * or invalid, which is exactly when `isValidLegalNature` returns false for the string form of the
 * value (a number is read as the string it prints as).
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
 * //   legacy: false,
 * // }
 * getLegalNature("2208");
 * // {
 * //   code: "2208",
 * //   description: "Entidade Binacional Itaipu",
 * //   category: { code: "2", description: "Entidades Empresariais" },
 * //   legacy: true,
 * //   currentCode: "2275",
 * // }
 * getLegalNature("3123")?.legacy; // true (Partido Político, retired without a successor)
 * getLegalNature("206-2")?.code; // "2062"
 * getLegalNature("206.2")?.category.description; // "Entidades Empresariais"
 * getLegalNature("0000"); // null
 * getLegalNature(206.2); // null (not a non-negative safe integer)
 * ```
 */
export const getLegalNature = (value: string | number): LegalNature | null => {
	if (!isLookupCode(value)) return null;

	const text = String(value);

	if (!isValidLegalNature(text)) return null;

	const code = text.replace(SEPARATORS_REGEX, "");

	return buildLegalNature(code, LEGAL_NATURE[code]);
};
