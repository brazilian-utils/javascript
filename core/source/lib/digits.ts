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

/**
 * Whether every scalar of the value is the same one, for whatever length the caller proved —
 * `isRepeated` and `isRepeatedCnpj` do the same check for one specific length; this one serves a
 * generator that has to run it on a base shorter than the document it is building.
 */
export function isRepeatedRun(value: Digits): boolean {
	const first = str.codeAt(value, 0);

	for (let index = 1; index < value.length; index++) {
		if (str.codeAt(value, index) !== first) {
			return false;
		}
	}

	return true;
}
