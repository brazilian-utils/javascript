import { PHONE_NATIONAL_MIN_LENGTH } from "../_internals/constants/phone";
import { isValidDDD } from "../_internals/is-valid-ddd/is-valid-ddd";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { LANDLINE_VALID_FIRST_NUMBERS } from "./constants";

const isValidLandlineFirstNumber = (value: string): boolean => {
	const firstDigit = value.charCodeAt(2) - 48;
	return LANDLINE_VALID_FIRST_NUMBERS.includes(firstDigit);
};

/**
 * Validates if a phone number is a valid Brazilian landline phone.
 *
 * A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before
 * validation, under the rule documented in `parsePhone`.
 *
 * @param {string} value - The phone number to validate.
 * @returns {boolean} True if the phone number is a valid landline phone, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLandlinePhone("(11) 3000-0000"); // true
 * isValidLandlinePhone("1130000000"); // true
 * isValidLandlinePhone("+55 11 3000-0000"); // true
 * isValidLandlinePhone("11987654321"); // false (mobile)
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const isValidLandlinePhone = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = normalizePhone(value);

	if (digits.length !== PHONE_NATIONAL_MIN_LENGTH) return false;

	if (!isValidDDD(digits)) return false;

	return isValidLandlineFirstNumber(digits);
};
