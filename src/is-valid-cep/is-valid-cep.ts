import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";

const CEP_REGEX = /^\d{8}$/;

/**
 * Validates if a CEP (Brazilian postal code) is valid.
 *
 * Spaces, dots and hyphens are ignored, so every punctuated form of a CEP is accepted, but
 * any other character, a letter in particular, makes the value invalid.
 *
 * A number is only read as a CEP when it is a non-negative safe integer.
 *
 * @param {string|number} cep - The CEP value to be validated.
 * @returns {boolean} True if the CEP is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCep("01310100"); // true
 * isValidCep("01310-100"); // true
 * isValidCep("92.500-000"); // true
 * isValidCep(20040020); // true
 * isValidCep("abc01310100"); // false (invalid format)
 * isValidCep("12345"); // false (invalid length)
 * isValidCep(-20040020); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const isValidCep = (cep: string | number): boolean => {
	if (!isLookupCode(cep)) return false;

	return CEP_REGEX.test(String(cep).replace(SEPARATORS_REGEX, ""));
};
