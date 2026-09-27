import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

/** Options of `formatCnh`. */
export type FormatCnhOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Whether to hide the first 3 digits and the 2 check digits with `*` (default: `false`, read for truthiness like `pad`). */
	obfuscate?: boolean;
};

/**
 * Formats a Brazilian CNH (Carteira Nacional de Habilitação) number.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNH number to be formatted.
 * @param {FormatCnhOptions} [options] - Optional options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros.
 * @param {boolean} [options.obfuscate] - If truthy, hides the first 3 digits and the 2 check
 * digits. Read for truthiness, the way `pad` is, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted CNH, or an empty string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCnh("12345678900"); // "123456789-00"
 * formatCnh("8900", { pad: true }); // "000000089-00"
 * formatCnh("12345678900", { obfuscate: true }); // "***456789-**"
 * formatCnh(2 ** 53); // "" (not a non-negative safe integer)
 * ```
 *
 * Resolução CONTRAN nº 886/2021, art. 4º I, defines the CNH registry number as 9 characters plus
 * 2 security check digits, which is the layout this mask reproduces; no official text publishes
 * the check-digit weights used to compute them. Resolução CONTRAN nº 1.020/2025, art. 10, repeats
 * the same layout ("nove caracteres e dois dígitos verificadores") and does not revoke the 886.
 *
 * No authority publishes a masking rule for the CNH either, so `obfuscate` applies the one the
 * Leis de Diretrizes Orçamentárias set for publishing a CPF, a number with the same structure: the
 * first 3 digits and the 2 check digits are hidden.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10202025.pdf
 * Resolução CONTRAN nº 1.020, de 1º de dezembro de 2025 (DOU of 09/12/2025), art. 10: the same
 * three numbers, the registro nacional "composto de nove caracteres e dois dígitos verificadores",
 * with no "módulo 11" rule and no weights; its art. 140 does not revoke Resolução nº 886/2021.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm
 * Lei nº 14.194/2021 (LDO 2022), art. 149: the CPF of the terceirizados it publishes is disclosed
 * so as to "ocultar os três primeiros dígitos e os dois dígitos verificadores", the rule first set
 * by Lei nº 12.309/2010 (LDO 2011), art. 87, § 5º, and repeated by the LDOs after it: the CPF
 * rule `obfuscate` borrows.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15321.htm
 * Lei nº 15.321/2025, the LDO for 2026.
 */
export const formatCnh = (value: string | number, options?: FormatCnhOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
			})
		: "";
