import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";
import { toStringSafe } from "../to-string-safe/to-string-safe";

const EXPLICIT_COUNTRY_CODE_REGEX = /^\s*(?:\+|00)\s*55/;

/**
 * Returns the digits of a phone value without an explicit Brazilian country code written as
 * `+55` or `0055`. A bare leading `55` is kept, since it is also the DDD of Santa Maria, RS,
 * and only the national length can tell the two apart (see `normalizePhone`).
 *
 * @param {string|number} value - The phone value, masked or not.
 * @returns {string} The digits, without the explicit `+55`/`0055` prefix.
 *
 * @example
 * ```typescript
 * stripPhoneCountryCode("+55 0800 123 4567"); // "08001234567"
 * stripPhoneCountryCode("0055 4004-1234"); // "40041234"
 * stripPhoneCountryCode("55 3333-4444"); // "5533334444"
 * ```
 */
export const stripPhoneCountryCode = (value: string | number): string => {
	const text = toStringSafe(value);

	const match = EXPLICIT_COUNTRY_CODE_REGEX.exec(text);

	return sanitizeToDigits(match ? text.slice(match[0].length) : text);
};
