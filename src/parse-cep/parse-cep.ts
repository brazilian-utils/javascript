import { CEP_LENGTH } from "../_internals/constants/cep";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes CEP formatting characters and returns only digits.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CEP value to be parsed.
 * @returns {string} The CEP value without formatting.
 *
 * @example
 * ```typescript
 * parseCep("01310-930"); // "01310930"
 * parseCep(-20040020); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const parseCep = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, CEP_LENGTH) : "";
