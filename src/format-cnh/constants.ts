export const PATTERN = "000000000-00";

/**
 * No authority publishes a masking rule for the CNH registry number, so this applies the one the
 * Leis de Diretrizes Orçamentárias set for publishing a CPF, "ocultar os três primeiros dígitos e
 * os dois dígitos verificadores" (Lei nº 14.194/2021, art. 149, a rule first set by Lei nº
 * 12.309/2010, art. 87, § 5º), to a number with the same structure: the first 3 digits and the 2
 * check digits are hidden, e.g. "***456789-**".
 */
export const OBFUSCATED_PATTERN = "***000000-**";
