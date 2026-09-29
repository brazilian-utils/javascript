/**
 * CNS (Cartão Nacional de Saúde) structural constants, shared by `isValidCns` and `formatCns`.
 *
 * @see Official: https://web.archive.org/web/20190106003442/http://cartaonet.datasus.gov.br/Rotina_JavaScript.doc
 * DATASUS, "Rotina de validação de CNS e Número Provisório", the routine the Cartão Nacional de
 * Saúde site (cartaonet.datasus.gov.br) published for download; the site is gone, so the link is
 * the Wayback Machine copy of the official file (last captured on 06/01/2019). It has two
 * routines, "Números que iniciam com '1' ou '2'" (the definitive CNS, PIS base + "000" or "001" +
 * check digit) and "Números que iniciam com '7', '8' ou '9'" (the provisional number, weights 15
 * to 1 summing to a multiple of 11), and names no other first digit: nothing official covers a
 * number starting with 5. Its 2007 version said "O Número Provisório sempre começa com '8'".
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 * ANVISA's two validation routines, the ones implemented here. The page sits behind a bot filter
 * and answers HTTP 403 to every non-browser client, so it has to be opened in a browser.
 * @see Based on: https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html
 * e-SUS APS documentation of the same DATASUS algorithm, reachable without a browser. It applies
 * the provisional routine to numbers starting with 5, 7, 8 or 9; this implementation follows the
 * DATASUS routine and the ANVISA page, which restrict it to 7, 8 and 9, so a 5 prefixed number is
 * rejected even when its weighted sum checks out: no official document names the prefix 5.
 */

/**
 * Shape a CNS number has to be written in: the 15 digits, optionally split into the printed
 * groups of 3, 4, 4 and 4 by whitespace or the usual mask characters. A run of separators is
 * tolerated between two groups, not just a single one, which is what the CPF, CNPJ, CAEPF and
 * certidão regexes of this library do.
 */
export const CNS_FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{4}[\s.\-/]*\d{4}$/;

/** Digits of the PIS/PASEP/NIS derived base embedded in a definitive CNS (starts with 1 or 2). */
export const CNS_DEFINITIVE_BASE_LENGTH = 11;

/** Suffix between the base and the check digit of a definitive CNS whose raw check digit is not 10. */
export const CNS_DEFINITIVE_SUFFIX = "000";

/** Suffix used when the raw check digit is 10: the weighted sum is raised by 2 and the digit recomputed. */
export const CNS_DEFINITIVE_ADJUSTED_SUFFIX = "001";
