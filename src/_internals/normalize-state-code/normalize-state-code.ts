/**
 * Normalizes a state code given by a caller: its surrounding whitespace removed and its letters
 * upper cased, without checking that the result is a state. A util whose own table is keyed by
 * the state codes checks the result against that table instead, and does not bundle the list of
 * the 27 codes. A value that is not a string is the empty string, which is no state code.
 *
 * @param {unknown} value - The state code as the caller passed it.
 * @returns {string} The normalized text, or `""` when the value is not a string.
 *
 * @example
 * ```typescript
 * normalizeStateCode(" sp "); // "SP"
 * normalizeStateCode("xx"); // "XX"
 * normalizeStateCode(35); // ""
 * ```
 */
export const normalizeStateCode = (value: unknown): string =>
	typeof value === "string" ? value.trim().toUpperCase() : "";
