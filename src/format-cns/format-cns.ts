import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

/** Options of `formatCns`. */
export type FormatCnsOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a CNS (Cartão Nacional de Saúde) number into the common display groups of 3-4-4-4
 * digits separated by spaces.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNS value to be formatted. It can be a string or a number.
 * @param {FormatCnsOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @returns {string} The formatted CNS string in the pattern "000 0000 0000 0000".
 *
 * @example
 * ```typescript
 * formatCns("123456789010000"); // "123 4567 8901 0000"
 * formatCns(123456789010000); // "123 4567 8901 0000"
 * formatCns("89010001", { pad: true }); // "000 0000 8901 0001"
 * formatCns(-123456789010000); // "" (not a non-negative safe integer)
 * ```
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
export const formatCns = (value: string | number, options?: FormatCnsOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: PATTERN,
			})
		: "";
