import { toStringSafe } from "../to-string-safe/to-string-safe";

/**
 * Sanitizes the input value by removing all non-digit characters. A value with no string
 * conversion (an object with a null prototype) reads as `""` instead of throwing.
 *
 * @param {string|number} value - The input value to be sanitized. It can be a string or a number.
 * @returns {string} A string containing only the digit characters from the input value.
 *
 * @example
 * ```typescript
 * sanitizeToDigits("abc123") // "123"
 * sanitizeToDigits("1a2b3c") // "123"
 * sanitizeToDigits(12345)    // "12345"
 * sanitizeToDigits("001-234") // "001234"
 * ```
 */
export const sanitizeToDigits = (value: string | number): string =>
	toStringSafe(value).replaceAll(/\D/g, "");
