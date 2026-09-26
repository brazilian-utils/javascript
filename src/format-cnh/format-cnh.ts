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
 * the check-digit weights used to compute them.
 *
 * No authority publishes a masking rule for the CNH either, so `obfuscate` applies the one Lei nº
 * 12.309/2010, art. 87, § 5º, sets for the CPF, a number with the same structure: the first 3
 * digits and the 2 check digits are hidden.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12309.htm
 * Lei nº 12.309/2010, art. 87, § 5º: "ocultar os três primeiros dígitos e os dois dígitos
 * verificadores do CPF", the rule `obfuscate` borrows.
 */
export const formatCnh = (value: string | number, options?: FormatCnhOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
			})
		: "";
