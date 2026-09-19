export const PATTERN = "000.00000.00-0";

/**
 * No authority publishes a masking rule for the PIS/PASEP/NIS, so this applies the rule Lei
 * nº 12.309/2010, art. 87, § 5º, sets for the CPF ("ocultar os três primeiros dígitos e os dois
 * dígitos verificadores") to a number with the same structure: the first 3 digits and the
 * single check digit are hidden, e.g. "***.45678.90-*".
 */
export const OBFUSCATED_PATTERN = "***.00000.00-*";
