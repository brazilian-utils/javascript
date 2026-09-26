import { isValidCnpj } from "../../is-valid-cnpj/is-valid-cnpj";
import { isValidCpf } from "../../is-valid-cpf/is-valid-cpf";
import { isValidEmail } from "../../is-valid-email/is-valid-email";
import { isValidPhone } from "../../is-valid-phone/is-valid-phone";
import {
	CPF_SYNTAX_REGEX,
	EMAIL_MAX_LENGTH,
	EVP_REGEX,
	PHONE_SYNTAX_REGEX,
} from "../constants/pix-key";
import { normalizePhone } from "../normalize-phone/normalize-phone";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

/** The kinds of Pix key `getPixKeyInfo` recognizes. */
export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "evp";

/**
 * Tells which kind of Pix key a value is, without normalizing it. Shared by `isValidPixKey`,
 * which only needs the kind to apply its `accept` option, and `getPixKeyInfo`, which then
 * writes the key in its canonical DICT form. `getPixKeyInfo` documents the rules: a value is
 * read as an EVP, an e-mail address, a CNPJ, a CPF and a mobile phone number, in that order,
 * and the CPF and the phone number only when written the way those are written.
 *
 * @param {string} value - The Pix key to be checked.
 * @returns {PixKeyType|null} The kind of Pix key, or `null` when the value is not a valid one.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */
export const detectPixKeyType = (value: string): PixKeyType | null => {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();

	if (EVP_REGEX.test(trimmed)) return "evp";

	if (trimmed.includes("@")) {
		const email = trimmed.toLowerCase();

		return isValidEmail(email) && email.length <= EMAIL_MAX_LENGTH ? "email" : null;
	}

	if (isValidCnpj(trimmed, { version: 2 })) return "cnpj";

	if (CPF_SYNTAX_REGEX.test(trimmed) && isValidCpf(sanitizeToDigits(trimmed))) return "cpf";

	if (!PHONE_SYNTAX_REGEX.test(trimmed)) return null;

	return isValidPhone(normalizePhone(trimmed), { accept: ["mobile"] }) ? "phone" : null;
};
