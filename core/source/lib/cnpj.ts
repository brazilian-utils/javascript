/**
 * CNPJ rules shared by the CNPJ utilities.
 *
 * Both versions go through one check digit calculation: each character is read as its code point
 * minus 48, which is the digit itself for `0` to `9` and the value the alphanumeric CNPJ assigns
 * to `A` to `Z` (17 to 42), exactly as the Receita Federal manual specifies.
 */

import { randomDigit } from "./random";

/** Exported for `generate-cnpj`, which needs the check digit of a base that has none yet. */
export const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** The check digit of a CNPJ base, under the rule both versions share. */
export function cnpjCheckDigit(cnpj: AsciiOf<14>, weights: List<IntRange<2, 9>>): IntRange<0, 9> {
	// The base is any 14 character ASCII value, so a character below '0' contributes a negative
	// term; the check digit itself is still 0 to 9, which the return type proves.
	let sum: IntRange<-6000, 10000> = 0;

	for (let index = 0; index < weights.length; index++) {
		sum += (cnpj.charCodeAt(index) - 48) * weights[index];
	}

	const remainder = sum % 11;

	return remainder < 2 ? 0 : 11 - remainder;
}

/** Whether both check digits of a 14 character CNPJ match its base. */
export function hasValidCnpjChecksum(cnpj: AsciiOf<14>): boolean {
	return (
		cnpj.charCodeAt(12) - 48 === cnpjCheckDigit(cnpj, FIRST_WEIGHTS) &&
		cnpj.charCodeAt(13) - 48 === cnpjCheckDigit(cnpj, SECOND_WEIGHTS)
	);
}

/**
 * Whether the value holds at least one upper cased ASCII letter.
 *
 * The scan reads positions rather than materializing the scalars, which the checked accessor
 * makes safe without a proof about the length.
 */
export function hasLetter(value: Ascii): boolean {
	for (let index = 0; index < value.length; index++) {
		// `value[index]?.charCodeAt(0)` is the checked *numeric* accessor: `value.charCodeAt(i)`
		// alone always answers `NaN` past the end, not `undefined`, but `value[index]` alone already
		// answers `undefined` there, and `?.charCodeAt(0)` reads the one scalar's code point only
		// when it is present — the ordinary spelling of `str.codeAtOpt`, which this unbounded loop
		// needs because the index is never provably in range.
		const point = value[index]?.charCodeAt(0) ?? 0;

		if (point >= 65 && point <= 90) {
			return true;
		}
	}

	return false;
}

/**
 * A random numeric CNPJ base: an 8-digit root and a 4-digit branch, each digit drawn
 * independently — matches the published `generateCnpj()` called with no branch, where an unset
 * branch also draws those 4 digits at random. Twelve separate draws, not a loop, is what lets the
 * result stay exactly 12 digits long.
 */
export function randomCnpjBase(): DigitsOf<12> {
	return `${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}`;
}

/** Whether every character of a 14 character value is the same one. */
export function isRepeatedCnpj(value: AsciiOf<14>): boolean {
	const first = value.charCodeAt(0);

	for (let index = 1; index < 14; index++) {
		if (value.charCodeAt(index) !== first) {
			return false;
		}
	}

	return true;
}
