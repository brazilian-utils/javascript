import { PHONE_NATIONAL_MAX_LENGTH } from "../_internals/constants/phone";
import { isValidDDD } from "../_internals/is-valid-ddd/is-valid-ddd";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { type PhoneVersion } from "../is-valid-phone/is-valid-phone";
import { MOBILE_SATELLITE_PREFIX, MOBILE_VALID_FIRST_NUMBERS } from "./constants";

export type { PhoneVersion } from "../is-valid-phone/is-valid-phone";

/** Options of `isValidMobilePhone`. */
export type IsValidMobilePhoneOptions = {
	/** Numbering rule to enforce over the 11 digit number: both accept 7, 8 or 9 as the first number digit; `1` (default) also accepts the `700` series, `2` rejects it. */
	version?: PhoneVersion;
};

const isValidMobileFirstNumber = (value: string, version?: PhoneVersion): boolean => {
	if (!MOBILE_VALID_FIRST_NUMBERS.includes(value.charCodeAt(2) - 48)) return false;

	if (!version || version === 1) return true;

	return !value.startsWith(MOBILE_SATELLITE_PREFIX, 2);
};

/**
 * Validates if a phone number is a valid Brazilian mobile phone.
 *
 * A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before
 * validation, under the rule documented in `parsePhone`.
 *
 * The first number digit (right after the DDD) must be 7, 8 or 9 under both numbering rules.
 * The `version` option only decides the `700` series:
 * - `1` (default): accepts it.
 * - `2`: rejects it, since it belongs to the satellite service.
 *
 * @param {string} value - The phone number to validate.
 * @param {IsValidMobilePhoneOptions} options - Optional validation options.
 * @param {1|2} options.version - The mobile numbering rule to enforce (see above). Defaults to 1.
 * @returns {boolean} True if the phone number is a valid mobile phone, false otherwise.
 *
 * @example
 * ```typescript
 * isValidMobilePhone("(11) 98765-4321"); // true (accepts both v1 and v2)
 * isValidMobilePhone("11987654321", { version: 2 }); // true
 * isValidMobilePhone("11712345678", { version: 1 }); // true
 * isValidMobilePhone("11712345678", { version: 2 }); // true (7 is SMP as well)
 * isValidMobilePhone("11612345678"); // false (6 is not SMP)
 * isValidMobilePhone("11612345678", { version: 2 }); // false
 * isValidMobilePhone("11700123456"); // true (version 1 keeps the 700 series)
 * isValidMobilePhone("11700123456", { version: 2 }); // false (the 700 series is satellite)
 * isValidMobilePhone("+55 11 98765-4321"); // true
 * ```
 *
 * Both versions enforce art. 12, I, "a" of Resolução Anatel nº 749/2022, `“7”, "8" e “9”:
 * Serviço Móvel Pessoal (SMP), ressalvado o disposto no inciso II deste artigo`, so a first
 * number digit of 6 is rejected. Up to 2.4.0 `version: 1` accepted it, although it is not SMP.
 *
 * That ressalva is art. 12, II, "a", `“700”: Serviço Móvel Global por Satélite (SMGS)`: the
 * `700` series is not SMP, so `version: 2` rejects `isValidMobilePhone("11700123456")`.
 * `version: 1` does not carve the series out and accepts it, for 2.3.0 compatibility. Resolução
 * Anatel nº 777/2025, art. 22, makes the series "SMGS e SMP por Satélite" from 1 March 2027.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * Resolução Anatel nº 749/2022, art. 12, I, "a": `“7”, "8" e “9”: Serviço Móvel Pessoal (SMP)`.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777
 */
export const isValidMobilePhone = (value: string, options?: IsValidMobilePhoneOptions): boolean => {
	if (typeof value !== "string") return false;

	const digits = normalizePhone(value);

	if (digits.length !== PHONE_NATIONAL_MAX_LENGTH) return false;

	if (!isValidDDD(digits)) return false;

	return isValidMobileFirstNumber(digits, options?.version);
};
