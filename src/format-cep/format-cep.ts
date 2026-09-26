import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCep`. */
export type FormatCepOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a given value as a Brazilian postal code (CEP).
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The value to be formatted, either as a string or a number.
 * @param {FormatCepOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - Whether to pad the value with leading zeros.
 * @returns {string} The formatted CEP string in the pattern "00000-000".
 *
 * @example
 * ```typescript
 * formatCep("01310930"); // "01310-930"
 * formatCep("1310930", { pad: true }); // "01310-930"
 * formatCep(-20040020); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const formatCep = (value: string | number, options?: FormatCepOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: "00000-000",
			})
		: "";
