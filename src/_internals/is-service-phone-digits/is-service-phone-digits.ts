import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
	SERVICE_PHONE_UTILITY_CODES,
} from "../constants/service-phone";

/**
 * Checks the structure of a run of digits as a Brazilian service number, without any country
 * code or mask handling: the Códigos Não Geográficos (11 digits), the abbreviated `300X`/`400X`
 * numbers (8 digits) or a designated 3 digit public utility code. See `isValidServicePhone` for
 * the rules behind each family.
 *
 * Every public utility code is exactly 3 digits, so a value of any other length that reaches
 * the last check matches none of them.
 *
 * @param {string} digits - The digits to check, already without mask or country code.
 * @returns {boolean} True if the digits are a valid service number.
 *
 * @example
 * ```typescript
 * isServicePhoneDigits("08001234567"); // true
 * isServicePhoneDigits("40041234"); // true
 * isServicePhoneDigits("190"); // true
 * isServicePhoneDigits("11987654321"); // false
 * ```
 */
export const isServicePhoneDigits = (digits: string): boolean => {
	if (digits.length === SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH) {
		return SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES.includes(
			digits.slice(0, SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH),
		);
	}

	if (digits.length === SERVICE_PHONE_ABBREVIATED_LENGTH) {
		return SERVICE_PHONE_ABBREVIATED_ROOTS.includes(
			digits.slice(0, SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH),
		);
	}

	return SERVICE_PHONE_UTILITY_CODES.includes(digits);
};
