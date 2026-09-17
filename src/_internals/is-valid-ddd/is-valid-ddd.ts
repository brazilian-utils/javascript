import { VALID_AREA_CODES } from "../constants/area-codes";

/**
 * Checks whether the first two digits of a sanitized Brazilian phone number form a valid DDD
 * (area code).
 *
 * @param {string} value - The sanitized (digits-only) phone number.
 * @returns {boolean} True if the first two digits are a valid Brazilian area code.
 *
 * @example
 * ```typescript
 * isValidDDD("11987654321"); // true
 * isValidDDD("00987654321"); // false
 * ```
 */
export const isValidDDD = (value: string): boolean => {
	const ddd = (value.charCodeAt(0) - 48) * 10 + (value.charCodeAt(1) - 48);
	return VALID_AREA_CODES.includes(ddd);
};
