import { type PixKeyType, getPixKeyInfo } from "../get-pix-key-info/get-pix-key-info";

/** Options of `isValidPixKey`. */
export type IsValidPixKeyOptions = {
	/** Kinds of Pix key that count as valid (default: all of them). */
	accept?: PixKeyType[];
};

/**
 * Validates a Pix key (chave Pix) against the DICT key formats.
 *
 * A value is valid when `getPixKeyInfo` recognizes it as a CPF, a CNPJ, an e-mail address, a
 * Brazilian mobile phone number or a random key (EVP), and when that kind is listed in
 * `options.accept`. The manual registers a "número de telefone celular", so a landline is not
 * a valid phone key.
 *
 * @param {string} value - The Pix key to validate.
 * @param {IsValidPixKeyOptions} [options] - Optional validation options.
 * @param {PixKeyType[]} [options.accept] - The kinds of key to accept. Defaults to all of them.
 * @returns {boolean} True if the value is a valid Pix key, false otherwise.
 *
 * @example
 * ```typescript
 * isValidPixKey("123.456.789-09"); // true
 * isValidPixKey("fulano@example.com"); // true
 * isValidPixKey("(11) 98765-4321"); // true
 * isValidPixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d"); // true
 * isValidPixKey("123.456.789-09", { accept: ["email", "evp"] }); // false
 * isValidPixKey("not a key"); // false
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification, key format
 * reference.
 * @see Official: https://github.com/bacen/pix-api
 * Pix (SPI) OpenAPI spec.
 */
export const isValidPixKey = (value: string, options?: IsValidPixKeyOptions): boolean => {
	const key = getPixKeyInfo(value);

	if (!key) return false;

	const accept = options?.accept;

	return Array.isArray(accept) ? accept.includes(key.type) : true;
};
