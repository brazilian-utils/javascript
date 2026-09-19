export const PATTERNS = {
	standard: "0000 0000 00 00",
	extended: "0000 0000 0 00 00",
};

/**
 * No authority publishes a masking rule for the título de eleitor, so this applies the rule Lei
 * nº 12.309/2010, art. 87, § 5º, sets for the CPF ("ocultar os três primeiros dígitos e os dois
 * dígitos verificadores") to a number with the same structure: the first 3 digits of the
 * sequential number and the 2 check digits are hidden, e.g. "***4 5678 01 **". The federative
 * union code stays visible.
 */
export const OBFUSCATED_PATTERNS = {
	standard: "***0 0000 00 **",
	extended: "***0 0000 0 00 **",
};
