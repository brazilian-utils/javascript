import { type FormatParams, format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

export type FormatCnoOptions = Pick<FormatParams, "pad">;

/**
 * Formats a CNO (Cadastro Nacional de Obras) number according to the official mask.
 *
 * The CNO replaced the CEI for construction works and kept its numbering, so both share the
 * same 12 digit, "00.000.00000/00" mask.
 *
 * Formats progressively, as far as the digits given go, so it can also be used as an input
 * mask while the user is still typing.
 *
 * @param {string|number} value - The CNO value to be formatted.
 * @param {FormatCnoOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros up to 12 digits.
 * @returns {string} The formatted CNO string in the pattern "00.000.00000/00", or an empty
 * string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCno("111130137368"); // "11.113.01373/68"
 * formatCno(401800097960); // "40.180.00979/60"
 * formatCno("979", { pad: true }); // "00.000.00009/79"
 * formatCno("979"); // "97.9"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 */
export const formatCno = (value: string | number, options?: FormatCnoOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value),
		pattern: PATTERN,
	});
};
