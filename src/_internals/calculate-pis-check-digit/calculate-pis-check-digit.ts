import { PIS_WEIGHTS } from "../constants/pis";

const MODULUS = 11;

/**
 * Calculates the check digit of a PIS (Programa de Integração Social) base, the eleventh digit of
 * the number.
 *
 * The ten base digits are multiplied by the weights 3, 2, 9, 8, 7, 6, 5, 4, 3 and 2, from left to
 * right. The check digit is 11 minus the remainder of the weighted sum by 11, or 0 when that
 * difference is 10 or 11.
 *
 * @param {string} base - The ten digits that precede the check digit.
 * @returns {number} The check digit, 0 to 9.
 *
 * @example
 * ```typescript
 * calculatePisCheckDigit("1234567890"); // 0
 * calculatePisCheckDigit("1000000000"); // 8
 * ```
 */
export const calculatePisCheckDigit = (base: string): number => {
	let sum = 0;

	for (let index = 0; index < PIS_WEIGHTS.length; index++) {
		sum += (base.charCodeAt(index) - 48) * PIS_WEIGHTS[index];
	}

	const digit = MODULUS - (sum % MODULUS);

	return digit >= 10 ? 0 : digit;
};
