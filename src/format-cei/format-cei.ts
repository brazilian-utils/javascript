import { CEI_LENGTH } from "../_internals/constants/cei";
import { type FormatParams, format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

export type FormatCeiOptions = Pick<FormatParams, "pad">;

/**
 * Formats a CEI (Cadastro Específico do INSS) number according to the official mask.
 *
 * Formats progressively, as far as the digits given go, so it can also be used as an input
 * mask while the user is still typing.
 *
 * @param {string|number} value - The CEI value to be formatted.
 * @param {FormatCeiOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros up to 12 digits.
 * @returns {string} The formatted CEI string in the pattern "00.000.00000/00", or an empty
 * string when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCei("277297118187"); // "27.729.71181/87"
 * formatCei(249859674386); // "24.985.96743/86"
 * formatCei("249", { pad: true }); // "00.000.00002/49"
 * formatCei("249"); // "24.9"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 */
export const formatCei = (value: string | number, options?: FormatCeiOptions): string => {
	if (isNullish(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeToDigits(value).slice(0, CEI_LENGTH),
		pattern: PATTERN,
	});
};
