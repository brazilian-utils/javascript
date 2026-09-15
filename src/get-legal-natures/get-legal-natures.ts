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
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const getLegalNatures = (): Record<string, string> => ({ ...LEGAL_NATURE });
