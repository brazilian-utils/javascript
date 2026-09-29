import { isLookupCode } from "../is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

/**
 * Reads the digits of a lookup code, or `null` when the value is not a code at all.
 *
 * A number is read when `isLookupCode` accepts it, a non-negative safe integer, since a sign or
 * a decimal point would otherwise be read as part of a code the caller never wrote. A string has
 * every character that is not a digit stripped, as up to 2.4.0 (the documented contract of the
 * lookups), so a masked or labelled code such as `"(0xx11)"`, `"35/SP"` or `"00.000.000"` is
 * read by its digits.
 *
 * @param {unknown} value - The value to read.
 * @returns {string|null} The digits of the code, or `null` when the value is not a number
 * `isLookupCode` accepts or a string, or when no digit is left.
 *
 * @example
 * ```typescript
 * readLookupDigits(" 355-030-8 "); // "3550308"
 * readLookupDigits(3550308); // "3550308"
 * readLookupDigits("(0xx11)"); // "011"
 * readLookupDigits(" - "); // null
 * readLookupDigits(-11); // null
 * ```
 */
export const readLookupDigits = (value: unknown): string | null => {
	if (!isLookupCode(value)) return null;

	const digits = sanitizeToDigits(value);

	return digits === "" ? null : digits;
};
