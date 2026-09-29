export const PATTERN = "0000 0000 00 00";

/**
 * No authority publishes a masking rule for the título de eleitor, so this applies the one the
 * Leis de Diretrizes Orçamentárias set for publishing a CPF, "ocultar os três primeiros dígitos e
 * os dois dígitos verificadores" (Lei nº 14.194/2021, art. 149, a rule first set by Lei nº
 * 12.309/2010, art. 87, § 5º), to a number with the same structure: the first 3 digits of the
 * sequential number and the 2 check digits are hidden, e.g. "***4 5678 01 **". The federative
 * union code stays visible.
 * Lei nº 15.321/2025 (LDO 2026), art. 163, repeats the rule.
 */
export const OBFUSCATED_PATTERN = "***0 0000 00 **";
