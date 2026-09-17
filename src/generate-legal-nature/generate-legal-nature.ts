import { isLegacyLegalNature } from "../_internals/is-legacy-legal-nature/is-legacy-legal-nature";
import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

/**
 * Generates a random valid Brazilian legal nature (natureza jurídica) code.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * Only the 92 codes of the Tabela de Natureza Jurídica 2021 are drawn: a code a past revision of
 * the table retired stays valid for `isValidLegalNature`, but is never generated.
 *
 * @returns {string} One of the legal nature codes in force published by the CONCLA.
 *
 * @example
 * ```typescript
 * generateLegalNature(); // "2062"
 * ```
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const generateLegalNature = (): string => {
	const legalNatureCodes = Object.keys(LEGAL_NATURE).filter((code) => !isLegacyLegalNature(code));

	return legalNatureCodes[Math.floor(Math.random() * legalNatureCodes.length)];
};
