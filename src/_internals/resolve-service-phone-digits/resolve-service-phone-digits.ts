import { isValidServicePhone } from "../../is-valid-service-phone/is-valid-service-phone";
import { normalizePhone } from "../normalize-phone/normalize-phone";
import { stripPhoneCountryCode } from "../strip-phone-country-code/strip-phone-country-code";

/**
 * Resolves the digits a service-number check should look at, so that every phone utility reads
 * the same value as a service number.
 *
 * When `value` carries a Brazilian country code under the `parsePhone` rule (`+55`, `0055`, or
 * a bare `55` followed by 10 or 11 digits) and the national number left behind is a service
 * number, that national number is returned. Otherwise the digits after an explicit `+55`/`0055`
 * prefix are returned, which keeps short numbers such as `+55 190` working and leaves a bare
 * `55` in place, since it is also a DDD.
 * @param {string|number} value - The phone number, with or without a country code.
 * @returns {string} The digits to run the service-number check on.
 */
export const resolveServicePhoneDigits = (value: string | number): string => {
	const national = normalizePhone(value);

	if (isValidServicePhone(national)) return national;

	return stripPhoneCountryCode(value);
};
