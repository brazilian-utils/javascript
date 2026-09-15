/**
 * Reads a value as a string the way `String(value)` does, but returns `""` when the value has no
 * string conversion (an object with a null prototype, an object whose `toString` throws) instead
 * of throwing, so a formatter handed hostile input never throws.
 *
 * @param {unknown} value - The value to read.
 * @returns {string} `String(value)`, or `""` when that conversion throws.
 *
 * @example
 * ```typescript
 * toStringSafe(123) // "123"
 * toStringSafe([1, 2]) // "1,2"
 * toStringSafe(Object.create(null)) // ""
 * ```
 */
export const toStringSafe = (value: unknown): string => {
	try {
		return String(value);
	} catch {
		return "";
	}
};
