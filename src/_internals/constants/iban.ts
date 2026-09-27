/**
 * Layout of a Brazilian IBAN, Resolução BCB nº 585/2026 art. 2º (which revoked Circular BCB nº
 * 3.625/2013 and kept its layout): `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 character ISPB
 * (the institution's Identificador do Sistema de Pagamentos Brasileiro, not the 3 digit COMPE
 * code) + 5 digit branch (agência) + 10 digit account (conta) + 1 letter account type + 1
 * alphanumeric owner indicator = 29 characters.
 *
 * The ISPB is "oito caracteres alfanuméricos [...] conforme as listas de participantes do [STR]
 * e do [SPI]" (art. 2º III), where the revoked Circular said "oito caracteres numéricos", so a
 * letter is accepted there; up to 2.4.0 only digits were. The ISO 13616 registry pattern
 * `BR2!n8!n5!n10!n1!a1!c` still writes the ISPB as `8!n`, and every ISPB of the STR list of
 * 25/09/2026 is still numeric.
 *
 * The registry pattern allows any letter as the account type, drawn from the "dicionário de
 * tipos" of the Catálogo de Serviços do Sistema Financeiro Nacional (art. 2º VI; the Circular
 * said the Catálogo de Mensagens e de Arquivos do SFN); `C` (conta corrente) and `P` (conta
 * poupança) are the usual values. Art. 2º § 1º numbers the owner indicator `1` for the first or
 * only holder, `2` for the second and so on up to the ninth, then `A` to `Z` from the tenth, so
 * `0` is not a valid owner indicator.
 * The two sources disagree on the account type: art. 2º VI calls it "um caractere alfanumérico",
 * while the ISO 13616 registry pattern `1!a` makes it a letter, and the registry is the form
 * followed here, so a digit in that position is deliberately rejected.
 * Only Brazilian IBANs follow this layout; every other ISO 13616 country has its own.
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=585
 * Resolução BCB nº 585, de 24/08/2026 (DOU 25/08/2026), art. 2º, which revoked Circular BCB nº
 * 3.625/2013 and keeps its layout, with an alphanumeric ISPB.
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf
 * Circular BCB nº 3.625/2013 (revoked), the original layout.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf
 * Diretrizes de Implementação do IBAN no Brasil
 */
export const BR_IBAN_LENGTH = 29;

export const BR_IBAN_REGEX = /^BR\d{2}[0-9A-Z]{8}\d{5}\d{10}[A-Z][A-Z1-9]$/;

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
