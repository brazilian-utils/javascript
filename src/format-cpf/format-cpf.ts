import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

/** Options of `formatCpf`. */
export type FormatCpfOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Whether to hide the first 3 digits and the 2 check digits with `*` (default: `false`, read for truthiness like `pad`). */
	obfuscate?: boolean;
};

/**
 * Formats a given CPF (Cadastro de Pessoas Físicas) value according to the Brazilian standard.
 *
 * @param {string|number} value - The CPF value to be formatted. It can be a string or a number.
 * @param {FormatCpfOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, the value will be padded with leading zeros if necessary.
 * @param {boolean} options.obfuscate - If truthy, hides the first 3 digits and the 2 check
 * digits. Read for truthiness, the way `pad` is, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted CPF string in the pattern "000.000.000-00".
 *
 * @example
 * ```typescript
 * formatCpf("12345678909"); // "123.456.789-09"
 * formatCpf(12345678909); // "123.456.789-09"
 * formatCpf("123456789", { pad: true }); // "001.234.567-89"
 * formatCpf("12345678909", { obfuscate: true }); // "***.456.789-**"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/cpf.py
 */
export const formatCpf = (value: string | number, options?: FormatCpfOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
	});
};
