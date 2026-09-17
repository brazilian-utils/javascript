/**
 * Checks whether a value is a `Date` that names a real instant.
 *
 * `new Date("nonsense")` is still a `Date`, only one whose time is `NaN`, so every date utility
 * of this library checks both before it reads a value handed to it, and returns the empty value
 * of its family (`null` or `false`) instead of computing with `NaN`.
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean} True when the value is a `Date` whose time is not `NaN`.
 *
 * @example
 * ```typescript
 * isValidDate(new Date(2024, 0, 1)); // true
 * isValidDate(new Date("nonsense")); // false
 * isValidDate("2024-01-01"); // false
 * isValidDate(null); // false
 * ```
 */
export const isValidDate = (value: unknown): value is Date =>
	value instanceof Date && !Number.isNaN(value.getTime());
