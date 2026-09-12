import { type FormatParams, format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

export type FormatCnpjOptions = Pick<FormatParams, "pad"> & {
	/** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
	/** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`). */
	obfuscate?: boolean;
};

const sanitize = (value: string | number, version?: FormatCnpjOptions["version"]): string => {
	if (version === 2) {
		return sanitizeToAlphanumeric(value);
	}

	return sanitizeToDigits(value);
};

/**
 * Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value according to the specified options.
 *
 * @param {string|number} value - The CNPJ value to be formatted. It can be a string or a number.
 * @param {FormatCnpjOptions} [options] - Optional configuration for formatting the CNPJ.
 * @param {boolean} options.pad - If true, the value will be padded with leading zeros if necessary.
 * @param {1|2} options.version - The version of the CNPJ to be sanitized.
 * @param {boolean} options.obfuscate - If true, hides the first 2 digits and the 2 check digits.
 * @returns {string} The formatted CNPJ string in the pattern "00.000.000/0000-00".
 *
 * @example
 * ```typescript
 * formatCnpj("12345678000195"); // "12.345.678/0001-95"
 * formatCnpj(12345678000195); // "12.345.678/0001-95"
 * formatCnpj("12345678000195", { pad: true }); // "12.345.678/0001-95"
 * formatCnpj("12345678", { pad: true }); // "00.000.012/3456-78"
 * formatCnpj("q0SLFMBD7VX439", { version: 2 }); // "Q0.SLF.MBD/7VX4-39"
 * formatCnpj("12345678000195", { obfuscate: true }); // "**.345.678/0001-**"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const formatCnpj = (value: string | number, options?: FormatCnpjOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitize(value, options?.version),
		pattern: options?.obfuscate === true ? OBFUSCATED_PATTERN : PATTERN,
	});
};
