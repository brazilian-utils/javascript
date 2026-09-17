import { LEGAL_NATURE_CATEGORIES } from "../_internals/constants/legal-nature-categories";
import { isLegacyLegalNature } from "../_internals/is-legacy-legal-nature/is-legacy-legal-nature";
import { buildLegalNature, type LegalNature } from "../get-legal-nature/get-legal-nature";
import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

/**
 * The options `getLegalNaturesByCategory` accepts, saying whether the legacy codes of the category
 * are listed too.
 */
export type GetLegalNaturesByCategoryOptions = {
	/**
	 * Whether the codes of the category that a past revision of the CONCLA table retired are listed
	 * alongside the ones in force (default: `false`).
	 */
	includeLegacy?: boolean;
};

/**
 * Retrieves every Brazilian legal nature (natureza jurídica) of a CONCLA category.
 *
 * The category is the first digit of the four digit code, the heading the table lists the code
 * under: 1 Administração Pública, 2 Entidades Empresariais, 3 Entidades sem Fins Lucrativos,
 * 4 Pessoas Físicas and 5 Organizações Internacionais e Outras Instituições Extraterritoriais.
 * It is accepted as a string or as a number, so `"2"` and `2` return the same list.
 *
 * Only the codes in force are listed by default. Pass `{ includeLegacy: true }` to add the ones a
 * past revision of the table retired (2076, 2100 and 2208 in category 2, 3042, 3050, 3093 and 3123
 * in category 3, 5002 in category 5), which come back with `legacy: true` and the `currentCode`
 * they correspond to today. The result is in ascending code order, since the table is keyed by the
 * codes themselves, and is a fresh array of fresh entries on every call.
 *
 * @param {string|number} category - The category code, `"1"` through `"5"` or 1 through 5.
 * @param {GetLegalNaturesByCategoryOptions} [options] - Optional listing options.
 * @param {boolean} [options.includeLegacy] - Whether to add the retired codes. Defaults to `false`.
 * @returns {LegalNature[]} The legal natures of the category, sorted by code, or an empty array
 * when the category is unknown or the input is invalid.
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
 * getLegalNaturesByCategory("4")[0];
 * // {
 * //   code: "4014",
 * //   description: "Empresa Individual Imobiliária",
 * //   category: { code: "4", description: "Pessoas Físicas" },
 * //   legacy: false,
 * // }
 * getLegalNaturesByCategory(4).length; // 6
 * getLegalNaturesByCategory("2").length; // 30
 * getLegalNaturesByCategory("2", { includeLegacy: true }).length; // 33
 * getLegalNaturesByCategory("9"); // []
 * ```
 */
export const getLegalNaturesByCategory = (
	category: string | number,
	options?: GetLegalNaturesByCategoryOptions,
): LegalNature[] => {
	if (typeof category !== "string" && typeof category !== "number") return [];

	const categoryCode = String(category);

	if (!Object.hasOwn(LEGAL_NATURE_CATEGORIES, categoryCode)) return [];

	const includeLegacy = Boolean(options?.includeLegacy);
	const legalNatures: LegalNature[] = [];

	for (const [code, description] of Object.entries(LEGAL_NATURE)) {
		if (!code.startsWith(categoryCode)) continue;
		if (!includeLegacy && isLegacyLegalNature(code)) continue;

		legalNatures.push(buildLegalNature(code, description));
	}

	return legalNatures;
};
