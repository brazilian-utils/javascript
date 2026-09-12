import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";

/**
 * Returns every Brazilian legal nature (natureza jurídica) published by the CONCLA.
 *
 * @returns {Record<string, string>} A fresh object mapping each 4 digit code to its description.
 *
 * @example
 * ```typescript
 * getLegalNatures()["2062"]; // "Sociedade Empresária Limitada"
 * ```
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 */
export const getLegalNatures = (): Record<string, string> => ({ ...LEGAL_NATURE });
