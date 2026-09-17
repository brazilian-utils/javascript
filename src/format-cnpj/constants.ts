export const PATTERN = "00.000.000/0000-00";

/**
 * gov.br / Receita Federal display convention: hides the first 2 digits and the 2 check
 * digits, e.g. "**.345.678/0001-**". Also used for the alphanumeric CNPJ (`version: 2`),
 * which shares the same digit/separator positions.
 */
export const OBFUSCATED_PATTERN = "**.000.000/0000-**";
