const BARE_DIGITS_REGEX = /^\d+$/;

/**
 * Left pads a lookup code with zeros up to the fixed width of its table, so the leading zeros a
 * table's codes carry never depend on how the caller wrote the value.
 *
 * A table whose codes all have the same width and may start with a zero (CBO with 6 digits,
 * CNAE with 7, NCM with 8) is looked up by that padded form, so `10205`, `"10205"` and
 * `"010205"` are all the CBO code `010205`, the same way `getBankByCode(1)` and
 * `getBankByCode("1")` are both the bank `"001"`.
 *
 * Only a value written as bare digits is padded: a masked value (`"6201-5/01"`) already carries
 * its separators and is handed back untouched, and so is anything that is not digits at all
 * (`"abc"`), which the caller's own format check then turns down. Surrounding whitespace is
 * trimmed either way, and an empty value is never turned into a code of zeros.
 *
 * @param {string|number} value - The value to normalize, a string or a number.
 * @param {number} length - The fixed digit width of the table's codes.
 * @returns {string} The trimmed value, left padded with zeros when it is written as bare digits.
 *
 * @example
 * ```typescript
 * padLookupCode(10205, 6); // "010205"
 * padLookupCode("10205", 6); // "010205"
 * padLookupCode(" 212405 ", 6); // "212405"
 * padLookupCode("6201-5/01", 7); // "6201-5/01"
 * padLookupCode("", 6); // ""
 * ```
 */
export const padLookupCode = (value: string | number, length: number): string => {
	const code = String(value).trim();

	return BARE_DIGITS_REGEX.test(code) ? code.padStart(length, "0") : code;
};
