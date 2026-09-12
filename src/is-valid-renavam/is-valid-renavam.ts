import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const RENAVAM_LENGTH = 11;

const padLeft = (input: string, padLength: number): string =>
	"0".repeat(padLength - input.length) + input;

/**
 * Validates if a RENAVAM (Registro Nacional de Veículos Automotores) is valid.
 *
 * RENAVAM can be in two formats:
 * - Old format: 9 digits (will be padded to 11 with zeros)
 * - New format: 11 digits
 *
 * The validation uses a checksum algorithm based on modulo 11.
 *
 * @param {string} renavam - The RENAVAM value to be validated.
 * @returns {boolean} True if the RENAVAM is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidRenavam("639884962"); // true (9 digits, old format)
 * isValidRenavam("00639884962"); // true (11 digits, new format)
 * isValidRenavam("12345678901"); // false (invalid checksum)
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 */
export const isValidRenavam = (renavam: string | number): boolean => {
	if (typeof renavam !== "string" && typeof renavam !== "number") return false;

	const digits = sanitizeToDigits(renavam);

	if (digits.length !== 9 && digits.length !== 11) return false;

	const paddedDigits = padLeft(digits, RENAVAM_LENGTH);

	const renavamWithoutDigit = paddedDigits.slice(0, 10);

	let reversedRenavam = "";

	for (const char of renavamWithoutDigit) {
		reversedRenavam = char + reversedRenavam;
	}

	let sum = 0;
	let multiplier = 2;
	for (const char of reversedRenavam) {
		const digit = Number.parseInt(char, 10);
		sum += digit * multiplier;

		multiplier = multiplier >= 9 ? 2 : multiplier + 1;
	}

	const mod11 = sum % 11;

	const expectedDigit = mod11 <= 1 ? 0 : 11 - mod11;

	const actualDigit = Number.parseInt(paddedDigits.charAt(10), 10);

	return expectedDigit === actualDigit;
};
