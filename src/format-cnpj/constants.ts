export const PATTERN = "00.000.000/0000-00";

/**
 * A convention of this library, with no official source: hides the first 2 characters and the 2
 * check digits, e.g. "**.345.678/0001-**", after the rule the Leis de Diretrizes Orçamentárias
 * set for the CPF. No law or Receita Federal act sets a masking rule for the CNPJ, whose data are
 * public (the Receita publishes the Cadastro Nacional da Pessoa Jurídica as open data), and the
 * ANPD says "não há um padrão para o mascaramento". Also used
 * for the alphanumeric CNPJ (`version: 2`), which shares the same positions.
 */
export const OBFUSCATED_PATTERN = "**.000.000/0000-**";
