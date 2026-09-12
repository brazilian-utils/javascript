/**
 * Checks whether every character in a string is the same (e.g. "00000000000" or "11111111111").
 *
 * @param {string} value - The string to check.
 * @returns {boolean} True if the string is non-empty and all its characters are identical.
 *
 * @example
 * ```typescript
 * isRepeatedDigits("00000000000"); // true
 * isRepeatedDigits("12345678909"); // false
 * isRepeatedDigits(""); // false
 * ```
 */
export const isRepeatedDigits = (value: string): boolean => {
	const firstChar = value[0];

	return firstChar !== undefined && value === firstChar.repeat(value.length);
};
