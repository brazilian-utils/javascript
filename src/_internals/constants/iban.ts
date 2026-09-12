/**
 * Layout of a Brazilian IBAN: `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 digit ISPB (the
 * institution's Identificador do Sistema de Pagamentos Brasileiro, not the 3 digit COMPE code)
 * + 5 digit branch (agência) + 10 digit account (conta) + 1 letter account type (`C` for
 * conta corrente, `P` for conta poupança) + 1 alphanumeric owner indicator = 29 characters.
 * Only Brazilian IBANs follow this layout; every other ISO 13616 country has its own.
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Circular&numero=3625 Circular BCB nº 3.625/2013 (Diretrizes de Implementação do IBAN no Brasil)
 */
export const BR_IBAN_LENGTH = 29;

export const BR_IBAN_REGEX = /^BR\d{2}\d{8}\d{5}\d{10}[CP][A-Z0-9]$/;
