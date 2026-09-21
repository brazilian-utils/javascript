/**
 * CNPJ rules shared by the CNPJ utilities.
 *
 * Both versions go through one check digit calculation: each character is read as its code point
 * minus 48, which is the digit itself for `0` to `9` and the value the alphanumeric CNPJ assigns
 * to `A` to `Z` (17 to 42), exactly as the Receita Federal manual specifies.
 */

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** The check digit of a CNPJ base, under the rule both versions share. */
export function cnpjCheckDigit(cnpj: AsciiOf<14>, weights: List<IntRange<2, 9>>): IntRange<0, 9> {
	// The base is any 14 character ASCII value, so a character below '0' contributes a negative
	// term; the check digit itself is still 0 to 9, which the return type proves.
	let sum: IntRange<-6000, 10000> = 0;

	for (let index = 0; index < weights.length; index++) {
		sum += (str.codeAt(cnpj, index) - 48) * seq.get(weights, index);
	}

	const remainder = sum % 11;

	return remainder < 2 ? 0 : 11 - remainder;
}

/** Whether both check digits of a 14 character CNPJ match its base. */
export function hasValidCnpjChecksum(cnpj: AsciiOf<14>): boolean {
	return (
		str.codeAt(cnpj, 12) - 48 === cnpjCheckDigit(cnpj, FIRST_WEIGHTS) &&
		str.codeAt(cnpj, 13) - 48 === cnpjCheckDigit(cnpj, SECOND_WEIGHTS)
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
		const point = str.codeAtOpt(value, index) ?? 0;

		if (point >= 65 && point <= 90) {
			return true;
		}
	}

	return false;
}

/** Whether every character of a 14 character value is the same one. */
export function isRepeatedCnpj(value: AsciiOf<14>): boolean {
	const first = str.codeAt(value, 0);

	for (let index = 1; index < 14; index++) {
		if (str.codeAt(value, index) !== first) {
			return false;
		}
	}

	return true;
}
