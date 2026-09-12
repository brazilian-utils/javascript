/**
 * Sanitizes the input value by removing all non-digit characters.
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
	value.toString().replaceAll(/\D/g, "");
