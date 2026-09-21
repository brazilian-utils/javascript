/**
 * `formatCnpj`, written once.
 *
 * The boundary guards are the handwritten package's, not a tidier version of them: a nullish
 * value answers the empty string, and a value the mask outruns is cut short rather than
 * padded, because that is what the JavaScript this repository ships already does.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
import { NON_ALPHANUMERIC, NON_DIGIT } from "./_internals/cnpj.ts";
import { layout } from "./_internals/mask.ts";
import { asString, isTruthy } from "./_std.ts";

/** Options of `formatCnpj`. */
export type FormatCnpjOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
	/** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`). */
	obfuscate?: boolean;
};

const PATTERN = "00.000.000/0000-00";
const OBFUSCATED_PATTERN = "**.000.000/0000-**";

/**
 * Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
 *
 * @param {string} value - The CNPJ value to be formatted.
 * @param {FormatCnpjOptions} [options] - Optional configuration for formatting the CNPJ.
 * @returns {string} The formatted CNPJ string in the pattern "00.000.000/0000-00".
 *
 * @example
 * ```typescript
 * formatCnpj("12345678000195"); // "12.345.678/0001-95"
 * formatCnpj("12345678", { pad: true }); // "00.000.012/3456-78"
 * formatCnpj("q0SLFMBD7VX439", { version: 2 }); // "Q0.SLF.MBD/7VX4-39"
 * formatCnpj("12345678000195", { obfuscate: true }); // "**.345.678/0001-**"
 * ```
 */
export const formatCnpj = (value: string | number, options?: FormatCnpjOptions): string => {
	if (value === null || value === undefined) {
		return "";
	}

	const text = asString(value);

	let cleaned = text.replaceAll(NON_DIGIT, "");

	if (options?.version === 2) {
		cleaned = text.replaceAll(NON_ALPHANUMERIC, "").toUpperCase();
	}

	let pattern = PATTERN;

	if (isTruthy(options?.obfuscate)) {
		pattern = OBFUSCATED_PATTERN;
	}

	return layout(cleaned, pattern, isTruthy(options?.pad));
};
