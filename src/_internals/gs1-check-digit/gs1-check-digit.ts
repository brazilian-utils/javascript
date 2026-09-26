/**
 * Calculates the GS1 modulus 10 check digit for a given string: the digits are weighed from the
 * right, alternating 3 and 1, and the products are added as they are (the rule of the GS1 General
 * Specifications, section 7.9.1, for GTIN and the other fixed length GS1 keys). The Luhn variant
 * is `mod10`.
 *
 * @param {string} value - The digits to calculate the check digit for, without it.
 * @returns {number} The calculated check digit (0-9).
 *
 * @example
 * ```typescript
 * gs1CheckDigit("37610425002123456"); // 9
 * ```
 */
export const gs1CheckDigit = (value: string): number => {
	let sum = 0;

	// `position` counts from the right: the last digit, and every second one from it, weighs 3.
	for (let position = 0; position < value.length; position++) {
		const weight = position % 2 === 0 ? 3 : 1;

		sum += weight * (value.charCodeAt(value.length - 1 - position) - 48);
	}

	const remainder = sum % 10;

	return remainder > 0 ? 10 - remainder : 0;
};
