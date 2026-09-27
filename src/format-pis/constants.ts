export const PATTERN = "000.00000.00-0";

/**
 * No authority publishes a masking rule for the PIS/PASEP/NIS, so this applies the one the Leis
 * de Diretrizes Orçamentárias set for publishing a CPF, "ocultar os três primeiros dígitos e os
 * dois dígitos verificadores" (Lei nº 14.194/2021, art. 149, a rule first set by Lei nº
 * 12.309/2010, art. 87, § 5º), to a number with the same structure: the first 3 digits and the
 * single check digit are hidden, e.g. "***.45678.90-*".
 */
export const OBFUSCATED_PATTERN = "***.00000.00-*";
