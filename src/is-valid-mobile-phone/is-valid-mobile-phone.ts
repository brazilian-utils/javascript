import { PHONE_NATIONAL_MAX_LENGTH } from "../_internals/constants/phone";
import { isValidDDD } from "../_internals/is-valid-ddd/is-valid-ddd";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import type { PhoneVersion } from "../is-valid-phone/is-valid-phone";
import { MOBILE_VALID_FIRST_NUMBERS_V1, MOBILE_VALID_FIRST_NUMBERS_V2 } from "./constants";

export type { PhoneVersion };

export type IsValidMobilePhoneOptions = {
	/** Numbering rule to enforce: `1` the pre-2016 8 digit rule, `2` the 9 digit one (default: `2`). */
	version?: PhoneVersion;
};

const isValidMobileFirstNumber = (value: string, version?: PhoneVersion): boolean => {
	const firstDigit = value.charCodeAt(2) - 48;

	if (!version || version === 1) {
		return MOBILE_VALID_FIRST_NUMBERS_V1.includes(firstDigit);
	}

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
 * - `2`: enforces the current format, whose first number digit must be 9.
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
 * isValidMobilePhone("11712345678", { version: 2 }); // false (v2 requires 9 as the first digit)
 * isValidMobilePhone("+55 11 98765-4321"); // true
 * ```
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
