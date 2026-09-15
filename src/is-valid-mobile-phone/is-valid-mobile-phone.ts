import { PHONE_NATIONAL_MAX_LENGTH } from "../_internals/constants/phone";
import { isValidDDD } from "../_internals/is-valid-ddd/is-valid-ddd";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { type PhoneVersion } from "../is-valid-phone/is-valid-phone";
import {
	MOBILE_SATELLITE_PREFIX,
	MOBILE_VALID_FIRST_NUMBERS_V1,
	MOBILE_VALID_FIRST_NUMBERS_V2,
} from "./constants";

export type { PhoneVersion } from "../is-valid-phone/is-valid-phone";

/** Options of `isValidMobilePhone`. */
export type IsValidMobilePhoneOptions = {
	/** Numbering rule to enforce over the 11 digit number: `1` (default) accepts 6, 7, 8 or 9 as the first number digit, `2` accepts 7, 8 or 9 and rejects the `700` series. */
	version?: PhoneVersion;
};

const isValidMobileFirstNumber = (value: string, version?: PhoneVersion): boolean => {
	const firstDigit = value.charCodeAt(2) - 48;

	if (!version || version === 1) {
		return MOBILE_VALID_FIRST_NUMBERS_V1.includes(firstDigit);
	}

	if (value.startsWith(MOBILE_SATELLITE_PREFIX, 2)) return false;

	return MOBILE_VALID_FIRST_NUMBERS_V2.includes(firstDigit);
};

/**
 * Validates if a phone number is a valid Brazilian mobile phone.
 *
 * A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before
 * validation, under the rule documented in `parsePhone`.
 *
 * The `version` option controls which mobile numbering rule is enforced:
 * - `1` (default): accepts the legacy 11-digit format, whose first number digit
 *   (right after the DDD) may be 6, 7, 8 or 9.
 * - `2`: enforces the current format, whose first number digit must be 7, 8 or 9 and whose
 *   `700` series is left out.
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
 * isValidMobilePhone("11612345678", { version: 2 }); // false (6 is Reserva Técnica)
 * isValidMobilePhone("11700123456", { version: 2 }); // false (the 700 series is satellite)
 * isValidMobilePhone("+55 11 98765-4321"); // true
 * ```
 *
 * `version: 1` (the default) is the pre-Resolução 749/2022 rule, which also accepts a leading
 * 6, kept for 2.3.0 compatibility. `version: 2` enforces art. 12, I, "a" of the resolution,
 * `“7”, "8" e “9”: Serviço Móvel Pessoal (SMP), ressalvado o disposto no inciso II deste
 * artigo`, so 6 is Reserva Técnica and is rejected.
 *
 * That ressalva is art. 12, II, "a", `“700”: Serviço Móvel Global por Satélite (SMGS)`: the
 * `700` series is not SMP, so `version: 2` rejects `isValidMobilePhone("11700123456")`.
 * `version: 1` does not carve the series out and accepts it, for 2.3.0 compatibility.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const isValidMobilePhone = (value: string, options?: IsValidMobilePhoneOptions): boolean => {
	if (typeof value !== "string") return false;

	const digits = normalizePhone(value);

	if (digits.length !== PHONE_NATIONAL_MAX_LENGTH) return false;

	if (!isValidDDD(digits)) return false;

	return isValidMobileFirstNumber(digits, options?.version);
};
