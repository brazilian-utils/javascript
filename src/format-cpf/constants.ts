export const PATTERN = "000.000.000-00";

/**
 * Hides the first 3 digits and the 2 check digits, e.g. "***.456.789-**": the rule the Leis de
 * Diretrizes Orçamentárias set for publishing a CPF, "ocultar os três primeiros dígitos e os dois
 * dígitos verificadores" (Lei nº 14.194/2021, art. 149, a rule first set by Lei nº 12.309/2010,
 * art. 87, § 5º).
 * Lei nº 15.321/2025 (LDO 2026), art. 163, repeats the rule.
 */
export const OBFUSCATED_PATTERN = "***.000.000-**";
