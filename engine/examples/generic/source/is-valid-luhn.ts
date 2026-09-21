/**
 * A deliberately domain-neutral example: the engine knows nothing about any particular library.
 *
 * Luhn is the check digit rule behind credit card numbers, IMEIs and several national identifiers
 * (ISO/IEC 7812-1, annex B).
 */

const DIGITS = /^[0-9]{2,19}$/;

/** Whether a digit string satisfies the Luhn check. */
export function isValidLuhn(value: string): boolean {
	if (!re.test(DIGITS, value)) {
		return false;
	}

	let sum: IntRange<0, 200> = 0;
	const scalars = str.codePoints(value);

	for (let index = 0; index < scalars.length; index++) {
		const digit = (seq.at(scalars, index) ?? 48) - 48;
		const doubled = (scalars.length - index) % 2 === 0;
		const weighted = doubled ? digit * 2 : digit;

		sum += weighted > 9 ? weighted - 9 : weighted;
	}

	return sum % 10 === 0;
}
