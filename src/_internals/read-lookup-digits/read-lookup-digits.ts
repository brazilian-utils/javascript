import { LOOKUP_SEPARATORS_REGEX } from "../constants/separators";
import { isLookupCode } from "../is-lookup-code/is-lookup-code";

const DIGITS_REGEX = /^\d+$/;

/**
 * Reads the digits of a lookup code, or `null` when the value is not a code at all.
 *
 * A number is read when `isLookupCode` accepts it, a non-negative safe integer. A string may
 * carry the mask characters `isValidCep` tolerates (whitespace, dot and hyphen), which are
 * dropped; any other character (a letter, a `$`, a `/`) makes the whole value something other
 * than a code, so it is rejected instead of having the offending character stripped. Stripping
 * it would turn `"1e1"`, `"a1b1"` or `"x11"` into the code `11`.
 *
 * @param {unknown} value - The value to read.
 * @returns {string|null} The digits of the code, or `null` when the value is not a number
 * `isLookupCode` accepts or a string of digits and separators, or when no digit is left.
 *
 * @example
 * ```typescript
 * readLookupDigits(" 355-030-8 "); // "3550308"
 * readLookupDigits(3550308); // "3550308"
 * readLookupDigits("1e1"); // null
 * readLookupDigits("DDD 11"); // null
 * readLookupDigits(" - "); // null
 * readLookupDigits(-11); // null
 * ```
 */
export const readLookupDigits = (value: unknown): string | null => {
	if (!isLookupCode(value)) return null;

	const digits = String(value).replaceAll(LOOKUP_SEPARATORS_REGEX, "");

	return DIGITS_REGEX.test(digits) ? digits : null;
};
