import { PHONE_COUNTRY_CODE } from "../_internals/constants/phone";
import {
	type PixKeyType,
	detectPixKeyType,
} from "../_internals/detect-pix-key-type/detect-pix-key-type";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { parseCnpj } from "../parse-cnpj/parse-cnpj";

export type { PixKeyType } from "../_internals/detect-pix-key-type/detect-pix-key-type";

/** A Pix key recognized by `getPixKeyInfo`, normalized to the canonical DICT form of its kind. */
export type PixKeyInfo = {
	/** Which kind of Pix key the value was recognized as. */
	type: PixKeyType;
	/** The key in the canonical DICT form for its kind. */
	value: string;
};

/** Writes a trimmed value, already known to be a key of each kind, in the canonical DICT form. */
const NORMALIZERS: Readonly<Record<PixKeyType, (trimmed: string) => string>> = {
	cpf: sanitizeToDigits,
	cnpj: (trimmed) => parseCnpj(trimmed, { version: 2 }),
	email: (trimmed) => trimmed.toLowerCase(),
	phone: (trimmed) => `+${PHONE_COUNTRY_CODE}${normalizePhone(trimmed)}`,
	evp: (trimmed) => trimmed.toLowerCase(),
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
 *   characters. The manual registers a "número de telefone celular", so only mobile numbers
 *   are recognized; a landline is not a Pix key. Masked, bare and `+55` prefixed inputs are
 *   all accepted;
 * - `evp`: the random key, a lowercase UUID written with its punctuation (8-4-4-4-12
 *   hexadecimal digits). The DICT issues version 4 UUIDs, but neither the pattern the manual
 *   registers nor its own example (`123e4567-e12b-12d1-a456-426655440000`, whose version
 *   nibble is `1`) constrains the version, so the version and variant nibbles are not enforced.
 *
 * The CPF and the phone number are recognized by the way they are written, not only by the
 * digits they carry: a value is read as a CPF when it is the bare 11 digits or the documented
 * mask, and as a phone number when it holds nothing but digits, spaces and the `+`, `-`, `(`,
 * `)` and `.` of the usual masks. Surrounding text is not stripped away, so
 * `"abc123.456.789-09"` is not a CPF key.
 *
 * A value with a valid CNPJ check digit is read as a CNPJ, even when it starts with `0055`
 * (a phone key inside a BR Code always carries the `+55` prefix). An 11 digit value can be
 * read both as a CPF and as a mobile phone number: when it is valid as both, it is read as a
 * CPF, unless it was written as a phone number. A `+55`/`0055` prefix or a DDD between
 * parentheses falls outside the CPF forms above, so a value written that way is never read as
 * a CPF, even when its digits carry a valid CPF check digit.
 *
 * @param {string} value - The Pix key to be parsed.
 * @returns {PixKeyInfo|null} The normalized key, or `null` exactly when `isValidPixKey` returns
 * `false` for the value.
 *
 * @example
 * ```typescript
 * getPixKeyInfo("123.456.789-09"); // { type: "cpf", value: "12345678909" }
 * getPixKeyInfo("Fulano@Example.COM "); // { type: "email", value: "fulano@example.com" }
 * getPixKeyInfo("(11) 98765-4321"); // { type: "phone", value: "+5511987654321" }
 * getPixKeyInfo("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D");
 * // { type: "evp", value: "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d" }
 * getPixKeyInfo("51998259765"); // { type: "cpf", value: "51998259765" } (also a valid phone)
 * getPixKeyInfo("+5551998259765"); // { type: "phone", value: "+5551998259765" }
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification, key format
 * reference.
 * @see Official: https://github.com/bacen/pix-api
 * Pix (SPI) OpenAPI spec.
 */
export const getPixKeyInfo = (value: string): PixKeyInfo | null => {
	const type = detectPixKeyType(value);

	if (type === null) return null;

	return { type, value: NORMALIZERS[type](value.trim()) };
};
