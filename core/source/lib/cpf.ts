/**
 * CPF rules shared by the CPF utilities.
 *
 * Library code, not intrinsics: both functions are expressible in the subset, so every target
 * gets the same implementation rather than a per-language shim.
 */

import { digitAt } from "./digits";

/** The check digit of a CPF base, under the Receita Federal rule (weights 10..2 and 11..2). */
export function cpfCheckDigit(cpf: DigitsOf<11>, size: IntRange<9, 10>): IntRange<0, 9> {
	let sum: IntRange<0, 1000> = 0;

	for (let index = 0; index < size; index++) {
		sum += digitAt(cpf, index) * (size + 1 - index);
	}

	const remainder = sum % 11;

	return remainder < 2 ? 0 : 11 - remainder;
}

/** Whether every scalar of the value is the same one, e.g. "00000000000". */
export function isRepeated(value: DigitsOf<11>): boolean {
	const first = str.codeAt(value, 0);

	for (let index = 1; index < 11; index++) {
		if (str.codeAt(value, index) !== first) {
			return false;
		}
	}

	return true;
}

