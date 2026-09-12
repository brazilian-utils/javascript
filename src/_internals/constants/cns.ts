/**
 * CNS (Cartão Nacional de Saúde) structural constants, shared by `isValidCns` and `formatCns`.
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 */

/** Total digits of a CNS number. */
export const CNS_LENGTH = 15;

/** Digits of the PIS/PASEP/NIS derived base embedded in a definitive CNS (starts with 1 or 2). */
export const CNS_DEFINITIVE_BASE_LENGTH = 11;

/** Suffix between the base and the check digit of a definitive CNS whose raw check digit is not 10. */
export const CNS_DEFINITIVE_SUFFIX = "000";

/** Suffix used when the raw check digit is 10: the weighted sum is raised by 2 and the digit recomputed. */
export const CNS_DEFINITIVE_ADJUSTED_SUFFIX = "001";
