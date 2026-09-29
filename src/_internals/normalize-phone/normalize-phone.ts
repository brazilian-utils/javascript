import {
	PHONE_COUNTRY_CODE_PREFIXES,
	PHONE_NATIONAL_MAX_LENGTH,
	PHONE_NATIONAL_MIN_LENGTH,
} from "../constants/phone";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";
import { stripPhoneCountryCode } from "../strip-phone-country-code/strip-phone-country-code";

const isNationalLength = (value: string): boolean =>
	value.length === PHONE_NATIONAL_MIN_LENGTH || value.length === PHONE_NATIONAL_MAX_LENGTH;

/**
 * Sanitizes a phone value to digits and removes the Brazilian country code.
 *
 * An explicit country code, written as `+55` or `0055` at the start of the value, is always
 * removed, however many digits follow, so a number still being typed is not garbled:
 * `"+55 11 9"` gives `"119"`.
 *
 * A bare `55` carries no such mark, so it is dropped only if the digits start with `0055` or
 * `55` **and** the remaining digits are exactly 10 or 11 long (DDD plus an 8 or 9 digit
 * subscriber number). Otherwise the digits are returned untouched, which keeps numbers from
 * the `55` area code (RS) intact: `"55987654321"` leaves 9 digits behind, so its leading `55`
 * is read as the DDD, not as the country code.
 *
 * @param {string|number} value - The phone value to normalize.
 * @returns {string} The digits of the national number, without the country code.
 *
 * @example
 * ```typescript
 * normalizePhone("+55 (11) 98765-4321"); // "11987654321"
 * normalizePhone("005511987654321"); // "11987654321"
 * normalizePhone("+55 11 9"); // "119"
 * normalizePhone("55987654321"); // "55987654321" (DDD 55, not a country code)
 * ```
 */
export const normalizePhone = (value: string | number): string => {
	const digits = sanitizeToDigits(value);
	const withoutExplicit = stripPhoneCountryCode(value);

	if (withoutExplicit.length !== digits.length) return withoutExplicit;

	for (const prefix of PHONE_COUNTRY_CODE_PREFIXES) {
		if (!digits.startsWith(prefix)) continue;

		const national = digits.slice(prefix.length);

		if (isNationalLength(national)) return national;
	}

	return digits;
};
