import { CPF_LENGTH } from "../_internals/constants/cpf";
import { PHONE_COUNTRY_CODE } from "../_internals/constants/phone";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";
import { isValidEmail } from "../is-valid-email/is-valid-email";
import { isValidPhone } from "../is-valid-phone/is-valid-phone";
import { parseCnpj } from "../parse-cnpj/parse-cnpj";
import { EMAIL_MAX_LENGTH, EVP_REGEX, PHONE_HINT_REGEX } from "./constants";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "evp";

export type PixKey = {
	/** Which kind of Pix key the value was recognized as. */
	type: PixKeyType;
	/** The key in the canonical DICT form for its kind. */
	value: string;
};

/**
 * Identifies a Pix key and normalizes it to the canonical form the DICT expects inside a BR
 * Code.
 *
 * The canonical forms are the ones listed in "Formatação das chaves do DICT no BR Code":
 * - `cpf`: 11 digits, no mask;
 * - `cnpj`: 14 characters, no mask, uppercase for the alphanumeric format;
 * - `email`: trimmed and lowercased, at most 77 characters;
 * - `phone`: E.164, `+55` followed by the DDD and the subscriber number, so at most 14
 *   characters. Masked, bare and `+55` prefixed inputs are all accepted;
 * - `evp`: the random key, a lowercase UUID version 4.
 *
 * A value with a valid CNPJ check digit is read as a CNPJ, even when it starts with `0055`
 * (a phone key inside a BR Code always carries the `+55` prefix). An 11 digit value can be
 * read both as a CPF and as a mobile phone number: when it is valid as both, it is read as a
 * CPF, unless it was written as a phone number, i.e. unless it starts with `+55`/`0055` or
 * wraps its DDD in parentheses.
 *
 * @param {string} value - The Pix key to be parsed.
 * @returns {PixKey|null} The normalized key, or `null` when the value is not a valid Pix key.
 *
 * @example
 * ```typescript
 * parsePixKey("123.456.789-09"); // { type: "cpf", value: "12345678909" }
 * parsePixKey("Fulano@Example.COM "); // { type: "email", value: "fulano@example.com" }
 * parsePixKey("(11) 98765-4321"); // { type: "phone", value: "+5511987654321" }
 * parsePixKey("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D");
 * // { type: "evp", value: "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d" }
 * parsePixKey("51998259765"); // { type: "cpf", value: "51998259765" } (also a valid phone)
 * parsePixKey("+5551998259765"); // { type: "phone", value: "+5551998259765" }
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Based on: https://github.com/bacen/pix-dict-api DICT (Diretório de Identificadores de
 * Contas Transacionais) OpenAPI spec, key format reference.
 * @see Based on: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 */
export const parsePixKey = (value: string): PixKey | null => {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();

	// Stryker disable next-line ConditionalExpression: an empty trimmed value never matches the EVP regex, never contains "@", normalizes to no valid phone, is never a valid CNPJ, and has no CPF-length digits, so every branch below already falls through to null on its own
	if (!trimmed) return null;

	if (EVP_REGEX.test(trimmed)) return { type: "evp", value: trimmed.toLowerCase() };

	if (trimmed.includes("@")) {
		const email = trimmed.toLowerCase();

		return isValidEmail(email) && email.length <= EMAIL_MAX_LENGTH
			? { type: "email", value: email }
			: null;
	}

	const national = normalizePhone(trimmed);
	const phone: PixKey | null = isValidPhone(national)
		? { type: "phone", value: `+${PHONE_COUNTRY_CODE}${national}` }
		: null;

	if (isValidCnpj(trimmed, { version: 2 })) {
		return { type: "cnpj", value: parseCnpj(trimmed, { version: 2 }) };
	}

	if (phone && PHONE_HINT_REGEX.test(trimmed)) return phone;

	const digits = sanitizeToDigits(trimmed);

	// Stryker disable next-line ConditionalExpression: isValidCpf already rejects any digits whose length is not CPF_LENGTH on its own, so this length check can never change the outcome
	if (digits.length === CPF_LENGTH && isValidCpf(digits)) return { type: "cpf", value: digits };

	return phone;
};
