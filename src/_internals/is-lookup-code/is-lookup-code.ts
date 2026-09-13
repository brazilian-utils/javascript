/**
 * Checks whether a value may be handed to `sanitizeToDigits` and used as a lookup code.
 *
 * A string always may: whatever it holds, the sanitizer reduces it to its digits and the
 * lookup either matches or misses. A number only may when it is a non-negative safe integer,
 * because a minus sign and a decimal point are not digits and the sanitizer drops them
 * silently: `-11` and `1.1` would both be read as the code `11`, and `-3550308` and `355030.8`
 * as the code `3550308`. A number past `Number.MAX_SAFE_INTEGER` has already lost digits by
 * the time it arrives, so it is rejected rather than sanitized into a code it never was.
 *
 * `Number.isSafeInteger` never coerces its argument, so it already rejects every value that is
 * not a number; the conversion below only hands TypeScript a number to compare against zero.
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean} True when the value is a string, or a number that is a non-negative safe
 * integer.
 *
 * @example
 * ```typescript
 * isLookupCode("3550308"); // true
 * isLookupCode(3550308); // true
 * isLookupCode(-11); // false
 * isLookupCode(1.1); // false
 * isLookupCode(2 ** 53); // false
 * isLookupCode(null); // false
 * ```
 */
export const isLookupCode = (value: unknown): value is string | number =>
	typeof value === "string" || (Number.isSafeInteger(value) && Number(value) >= 0);
