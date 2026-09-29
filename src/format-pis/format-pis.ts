import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
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
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
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
 * formatPis(100.1); // "" (not a non-negative safe integer)
 * ```
 *
 * No authority publishes a masking rule for the PIS, so `obfuscate` applies the one the Leis de
 * Diretrizes Orçamentárias set for publishing a CPF, a number with the same structure: the first 3
 * digits and the check digit are hidden.
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm
 * Lei nº 14.194/2021 (LDO 2022), art. 149: the CPF of the terceirizados it publishes is disclosed
 * so as to "ocultar os três primeiros dígitos e os dois dígitos verificadores", the rule first set
 * by Lei nº 12.309/2010 (LDO 2011), art. 87, § 5º, and repeated by the LDOs after it: the CPF
 * rule `obfuscate` borrows.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15321.htm#art163
 * Lei nº 15.321/2025, the LDO for 2026, art. 163: the CPF published under its arts. 160 and 162
 * is disclosed so as to "ocultar os três primeiros dígitos e os dois dígitos verificadores do
 * número de inscrição no CPF", the same rule.
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const formatPis = (value: string | number, options?: FormatPisOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
			})
		: "";
