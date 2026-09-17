import { toStringSafe } from "../to-string-safe/to-string-safe";

/**
 * Sanitizes the input value by removing all non-alphanumeric characters and uppercasing the result.
 * A value with no string conversion (an object with a null prototype) reads as `""` instead of throwing.
 *
 * @param {string|number} value - The input value to be sanitized. It can be a string or a number.
 * @returns {string} A string containing only uppercase alphanumeric characters from the input value.
 *
 * @example
 * ```typescript
 * sanitizeToAlphanumeric("abc123") // "ABC123"
 * sanitizeToAlphanumeric("Ab-12.3") // "AB123"
 * sanitizeToAlphanumeric(12345) // "12345"
 * ```
 */
export const sanitizeToAlphanumeric = (value: string | number): string =>
	toStringSafe(value)
		.replaceAll(/[^A-Za-z0-9]/g, "")
		.toUpperCase();
