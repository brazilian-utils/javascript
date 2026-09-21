/**
 * Digit and ASCII helpers shared by the document utilities.
 *
 * `re.retain` keeps only the scalars of a comptime character class, which is one pass in every
 * target and refines the result to that class: the callers below get a `Digits` or an `Ascii`
 * without a check of their own.
 */

/** The ASCII digits. */
const DIGIT = /^[0-9]$/;

/** The ASCII digits and letters, before case folding. */
const ALPHANUMERIC = /^[0-9A-Za-z]$/;

const LOWER_A = 97;
const LOWER_Z = 122;

/** Keeps only the ASCII digits of a value, dropping every mask character. */
export function keepDigits(value: string): Digits {
	return re.retain(DIGIT, value);
}

/** Keeps only the ASCII digits and letters of a value, upper casing the letters. */
export function keepAlphanumeric(value: string): Ascii {
	return str.asciiUpper(re.retain(ALPHANUMERIC, value));
}

/** The numeric value of one ASCII digit. */
export function digitAt(value: Digits, index: Int): IntRange<0, 9> {
	return str.codeAt(value, index) - 48;
}
