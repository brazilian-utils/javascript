const SEPARATORS_REGEX = /[\s.-]/g;

const CEP_REGEX = /^\d{8}$/;

/**
 * Validates if a CEP (Brazilian postal code) is valid.
 *
 * Spaces, dots and hyphens are ignored, so every punctuated form of a CEP is accepted, but
 * any other character, a letter in particular, makes the value invalid.
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
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const isValidCep = (cep: string | number): boolean => {
	if (typeof cep !== "string" && typeof cep !== "number") return false;

	return CEP_REGEX.test(String(cep).replace(SEPARATORS_REGEX, ""));
};
