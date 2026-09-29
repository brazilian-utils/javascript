import { buildLegalNature as buildLegalNatureEntry } from "../_internals/build-legal-nature/build-legal-nature";
import { type LegalNatureCategory } from "../_internals/constants/legal-nature-categories";
import { readLegalNatureCode } from "../_internals/read-legal-nature-code/read-legal-nature-code";
import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

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
 * Builds the entry of a code known to be in `LEGAL_NATURE`.
 *
 * @deprecated An implementation detail that shipped by accident in 2.4.0. It is not part of the
 * API and goes away in v3.
 * @param {string} code - The 4 digit legal nature code, without formatting.
 * @param {string} description - The description `LEGAL_NATURE` holds for the code.
 * @returns {LegalNature} The legal nature entry of the code.
 */
export const buildLegalNature = (code: string, description: string): LegalNature =>
	buildLegalNatureEntry(code, description);

/**
 * Looks a Brazilian legal nature (natureza jurídica) code up.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 4
 * digits, or the `NNN-N` mask, with any run of separators (whitespace, `.`, `-` or `/`) between
 * the third and the fourth digit and optional surrounding whitespace. `getLegalNature("206.2")`
 * resolves like `getLegalNature("206-2")`, while a separator anywhere else (`"2-0-6-2"`) or any
 * other character (`"2062a"`) gives `null`. A number is only read as a code when it is a
 * non-negative safe integer: its sign and its decimal point are not mask characters, so
 * `getLegalNature(-2062)` and `getLegalNature(206.2)` return `null` instead of being read as `2062`.
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
 * The lookup is made on the description table instead of the code list `isValidLegalNature`
 * checks, so that list is not bundled on top of it; both accept exactly the same codes.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @param {string|number} value - The legal nature code to look up, with or without formatting.
 * @returns {LegalNature|null} The matching legal nature entry, or null when the code is unknown
 * or invalid, which is exactly when `isValidLegalNature` returns false.
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
 * getLegalNature("2-0-6-2"); // null (a separator after the third digit only)
 * getLegalNature("0000"); // null
 * getLegalNature(206.2); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const getLegalNature = (value: string | number): LegalNature | null => {
	const code = readLegalNatureCode(value);

	if (!Object.hasOwn(LEGAL_NATURE, code)) return null;

	return buildLegalNatureEntry(code, LEGAL_NATURE[code]);
};
