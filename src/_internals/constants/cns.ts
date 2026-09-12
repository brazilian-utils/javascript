/**
 * CNS (Cartão Nacional de Saúde) structural constants, shared by `isValidCns` and `formatCns`.
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 * @see Based on: https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html
 * e-SUS APS documentation of the same DATASUS algorithm, reachable without a browser.
 */

/**
 * Shape a CNS number has to be written in: the 15 digits, optionally split into the printed
 * groups of 3, 4, 4 and 4 by whitespace or the usual mask characters.
 */
export const CNS_FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{4}[\s.\-/]*\d{4}$/;

/** Digits of the PIS/PASEP/NIS derived base embedded in a definitive CNS (starts with 1 or 2). */
export const CNS_DEFINITIVE_BASE_LENGTH = 11;

/** Suffix between the base and the check digit of a definitive CNS whose raw check digit is not 10. */
export const CNS_DEFINITIVE_SUFFIX = "000";

/** Suffix used when the raw check digit is 10: the weighted sum is raised by 2 and the digit recomputed. */
export const CNS_DEFINITIVE_ADJUSTED_SUFFIX = "001";
