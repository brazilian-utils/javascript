/**
 * Layout of a Brazilian IBAN: `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 digit ISPB (the
 * institution's Identificador do Sistema de Pagamentos Brasileiro, not the 3 digit COMPE code)
 * + 5 digit branch (agência) + 10 digit account (conta) + 1 letter account type + 1
 * alphanumeric owner indicator = 29 characters. The registry pattern `BR2!n8!n5!n10!n1!a1!c`
 * allows any letter as the account type, drawn from the "Dicionário de Tipos" of the Catálogo
 * de Mensagens e de Arquivos do SFN; `C` (conta corrente) and `P` (conta poupança) are the
 * usual values.
 * Only Brazilian IBANs follow this layout; every other ISO 13616 country has its own.
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf Diretrizes de Implementação do IBAN no Brasil
 */
export const BR_IBAN_LENGTH = 29;

export const BR_IBAN_REGEX = /^BR\d{2}\d{8}\d{5}\d{10}[A-Z][A-Z0-9]$/;
