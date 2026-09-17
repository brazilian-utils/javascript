/**
 * Checks whether a value is `null` or `undefined`.
 *
 * Public functions of this library must never throw on bad input, so every entry point
 * guards its argument with this helper before handing it to a sanitizer and returns the
 * empty value of its family instead (`""` for `format*`/`parse*`, `false` for `isValid*`,
 * `null` where the family already uses `null` and `[]` for list getters).
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean} True when the value is `null` or `undefined`.
 *
 * @example
 * ```typescript
 * isNullish(null); // true
 * isNullish(undefined); // true
 * isNullish(""); // false
 * isNullish(0); // false
 * ```
 */
export const isNullish = (value: unknown): value is null | undefined =>
	value === null || value === undefined;
