/**
 * CPF rules shared by the CPF utilities.
 *
 * Library code, not intrinsics: both functions are expressible in the subset, so every target
 * gets the same implementation rather than a per-language shim.
 */

import { digitAt } from "./digits";
import { randomDigit } from "./random";

/** The check digit of a CPF base, under the Receita Federal rule (weights 10..2 and 11..2). */
export function cpfCheckDigit(cpf: DigitsOf<11>, size: IntRange<9, 10>): IntRange<0, 9> {
	let sum: IntRange<0, 1000> = 0;

	for (let index = 0; index < size; index++) {
		sum += digitAt(cpf, index) * (size + 1 - index);
	}

	const remainder = sum % 11;

	return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * A random CPF base: 8 digits plus a região fiscal digit, each drawn independently — matches the
 * published `generateCpf()` called with no state, where an unset state also draws that 9th digit
 * at random. Nine separate draws, not a loop, is what lets the result stay exactly 9 digits long.
 */
export function randomCpfBase(): DigitsOf<9> {
	return `${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}`;
}

/** Whether every scalar of the value is the same one, e.g. "00000000000". */
export function isRepeated(value: DigitsOf<11>): boolean {
	const first = value.charCodeAt(0);

	for (let index = 1; index < 11; index++) {
		if (value.charCodeAt(index) !== first) {
			return false;
		}
	}

	return true;
}

