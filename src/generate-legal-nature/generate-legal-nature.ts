import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

/**
 * Generates a random valid Brazilian legal nature (natureza jurídica) code.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} One of the legal nature codes published by the CONCLA.
 *
 * @example
 * ```typescript
 * generateLegalNature(); // "2062"
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 */
export const generateLegalNature = (): string => {
	const legalNatureCodes = Object.keys(LEGAL_NATURE);

	return legalNatureCodes[Math.floor(Math.random() * legalNatureCodes.length)];
};
