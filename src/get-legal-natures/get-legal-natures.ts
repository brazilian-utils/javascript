import { isLegacyLegalNature } from "../_internals/is-legacy-legal-nature/is-legacy-legal-nature";
import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

/** The object form `getLegalNatures` accepts, saying whether the legacy codes are listed too. */
export type GetLegalNaturesParams = {
	/**
	 * Whether the 8 codes a past revision of the CONCLA table retired are listed alongside the 92
	 * in force (default: `false`).
	 */
	includeLegacy?: boolean;
};

/**
 * Returns every Brazilian legal nature (natureza jurídica) published by the CONCLA.
 *
 * Only the 92 codes of the Tabela de Natureza Jurídica 2021, the ones in force, are listed by
 * default. Pass `{ includeLegacy: true }` to add the 8 a past revision of the table retired, which
 * `isValidLegalNature` keeps accepting and `getLegalNature` keeps looking up because they still
 * appear in records filed while they were in force.
 *
 * @param {GetLegalNaturesParams} [params] - Optional listing options.
 * @param {boolean} [params.includeLegacy] - Whether to add the retired codes. Defaults to `false`.
 * @returns {Record<string, string>} A fresh object mapping each 4 digit code to its description.
 *
 * @example
 * ```typescript
 * getLegalNatures()["2062"]; // "Sociedade Empresária Limitada"
 * Object.keys(getLegalNatures()).length; // 92
 * getLegalNatures()["2208"]; // undefined (retired by a past revision)
 * getLegalNatures({ includeLegacy: true })["2208"]; // "Entidade Binacional Itaipu"
 * Object.keys(getLegalNatures({ includeLegacy: true })).length; // 100
 * ```
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const getLegalNatures = (params?: GetLegalNaturesParams): Record<string, string> => {
	if (params?.includeLegacy ?? false) return { ...LEGAL_NATURE };

	const legalNatures: Record<string, string> = {};

	for (const [code, description] of Object.entries(LEGAL_NATURE)) {
		if (!isLegacyLegalNature(code)) legalNatures[code] = description;
	}

	return legalNatures;
};
