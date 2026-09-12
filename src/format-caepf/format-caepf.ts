import { type FormatParams, format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

export type FormatCaepfOptions = Pick<FormatParams, "pad">;

/**
 * Formats a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number according to the
 * official mask.
 *
 * Formats progressively, as far as the digits given go, so it can also be used as an input
 * mask while the user is still typing.
 *
 * @param {string|number} value - The CAEPF value to be formatted.
 * @param {FormatCaepfOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros up to 14 digits.
 * @returns {string} The formatted CAEPF string in the pattern "000.000.000/000-00", or an
 * empty string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCaepf("29311861000184"); // "293.118.610/001-84"
 * formatCaepf(41142260000101); // "411.422.600/001-01"
 * formatCaepf("184", { pad: true }); // "000.000.000/001-84"
 * formatCaepf("184"); // "184"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf
 */
export const formatCaepf = (value: string | number, options?: FormatCaepfOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: PATTERN,
	});
};
