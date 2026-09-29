import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

/** Options of `formatPis`. */
export type FormatPisOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Whether to hide the first 3 digits and the check digit with `*` (default: `false`, read for truthiness like `pad`). */
	obfuscate?: boolean;
};

/**
 * Formats a PIS (Programa de Integração Social) number according to the specified pattern.
 *
 * @param {string|number} value - The PIS number to be formatted. It can be a string or a number.
 * @param {FormatPisOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @param {boolean} options.obfuscate - If truthy, hides the first 3 digits and the check digit.
 * Read for truthiness, the way `pad` is, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted PIS number as a string.
 *
 * @example
 * ```typescript
 * formatPis("12345678901"); // "123.45678.90-1"
 * formatPis(12345678901); // "123.45678.90-1"
 * formatPis("123456789", { pad: true }); // "001.23456.78-9"
 * formatPis("12345678901", { obfuscate: true }); // "***.45678.90-*"
 * ```
 *
 * No authority publishes a masking rule for the PIS, so `obfuscate` applies the one Lei nº
 * 12.309/2010, art. 87, § 5º, sets for the CPF, a number with the same structure: the first 3
 * digits and the check digit are hidden.
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12309.htm
 * Lei nº 12.309/2010, art. 87, § 5º: "ocultar os três primeiros dígitos e os dois dígitos
 * verificadores do CPF", the rule `obfuscate` borrows.
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const formatPis = (value: string | number, options?: FormatPisOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
			});
