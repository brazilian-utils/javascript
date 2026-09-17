import { CEP_LENGTH } from "../_internals/constants/cep";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes CEP formatting characters and returns only digits.
 *
 * @param {string|number} value - The CEP value to be parsed.
 * @returns {string} The CEP value without formatting.
 *
 * @example
 * ```typescript
 * parseCep("01310-930"); // "01310930"
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const parseCep = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, CEP_LENGTH);
