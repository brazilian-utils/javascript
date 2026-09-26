/**
 * Calculates the modulus 10 (Luhn) check digit for a given string: the digits are weighed from
 * the right, alternating 2 and 1, and the digits of each product are added (the boleto, credit
 * card and bank account rule). The GS1 variant, weights 3 and 1 with the products added as they
 * are, is `gs1CheckDigit`, kept apart so the utils that need one rule do not bundle the other.
 *
 * @param {string} value - The string to calculate the check digit for.
 * @returns {number} The calculated check digit (0-9).
 *
 * @example
 * ```typescript
 * mod10("001900000"); // 9
 * ```
 */
export const mod10 = (value: string): number => {
	let sum = 0;
	const length = value.length;
	for (let i = 0; i < length; i++) {
		const digit = value.charCodeAt(length - 1 - i) - 48;
		const result = digit * (i % 2 === 0 ? 2 : 1);
		sum += result > 9 ? result - 9 : result;
	}
	const remainder = sum % 10;
	return remainder > 0 ? 10 - remainder : 0;
};
