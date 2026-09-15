/**
 * Layout of a Brazilian IBAN: `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 digit ISPB (the
 * institution's Identificador do Sistema de Pagamentos Brasileiro, not the 3 digit COMPE code)
 * + 5 digit branch (agência) + 10 digit account (conta) + 1 letter account type + 1
 * alphanumeric owner indicator = 29 characters. The registry pattern `BR2!n8!n5!n10!n1!a1!c`
 * allows any letter as the account type, drawn from the "Dicionário de Tipos" of the Catálogo
 * de Mensagens e de Arquivos do SFN; `C` (conta corrente) and `P` (conta poupança) are the
 * usual values. Circular BCB nº 3.625/2013 art. 2º § 1º numbers the owner indicator `1` for
 * the first or only holder, `2` for the second and so on up to the ninth, then `A` to `Z` from
 * the tenth, so `0` is not a valid owner indicator.
 * The two sources disagree on the account type: art. 2º VI of the same Circular calls it "um
 * caractere alfanumérico", while the ISO 13616 registry pattern `1!a` makes it a letter, and the
 * registry is the form followed here, so a digit in that position is deliberately rejected.
 * Only Brazilian IBANs follow this layout; every other ISO 13616 country has its own.
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf
 * Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf
 * Diretrizes de Implementação do IBAN no Brasil
 */
export const BR_IBAN_LENGTH = 29;

export const BR_IBAN_REGEX = /^BR\d{2}\d{8}\d{5}\d{10}[A-Z][A-Z1-9]$/;

/**
 * Shape an IBAN has to be written in: letters and digits, optionally split into the ISO 13616
 * print groups of 4 (the last one shorter, 1 to 3 characters, when the length is not a multiple
 * of 4) by whitespace, `.`, `-` or `/`, the same interchangeable mask characters `isValidCpf`
 * and `isValidCnpj` accept. A separator inside a group, a group of any other size, a run of
 * separators between two groups (ISO 13616 prints a single one) or any character outside letters
 * and digits makes the value something other than an IBAN, so it is rejected instead of stripped.
 */
export const IBAN_FORMAT_REGEX =
	/^[A-Za-z0-9]{4}(?:[\s.\-/]?[A-Za-z0-9]{4})*(?:[\s.\-/]?[A-Za-z0-9]{1,3})?$/;
