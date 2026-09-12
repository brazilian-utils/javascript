import { mod10 } from "../_internals/mod10/mod10";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { MAX_LENGTH, MIN_LENGTH } from "./constants";

/**
 * Validates a payment card number (crédito ou débito) using the Luhn algorithm.
 *
 * Accepts the usual mask characters (spaces and hyphens) between digits. Only checks the
 * digit count (12 to 19, the range every ISO/IEC 7812-1 issuer identification number falls
 * into) and the Luhn check digit; it performs no brand detection (Visa, Mastercard, Amex...),
 * issuer range lookup or expiration/CVV checks.
 *
 * @param {string|number} value - The card number to be validated.
 * @returns {boolean} True when `value` sanitizes to 12-19 digits ending in a valid Luhn check digit.
 *
 * @example
 * ```typescript
 * isValidCreditCard("4111111111111111"); // true (Visa test number)
 * isValidCreditCard("5555555555554444"); // true (Mastercard test number)
 * isValidCreditCard("378282246310005"); // true (American Express test number)
 * isValidCreditCard("4111 1111 1111 1111"); // true (spaced mask)
 * isValidCreditCard("4111111111111112"); // false (bad check digit)
 * isValidCreditCard("123456789"); // false (too short)
 * ```
 *
 * @see Official: https://www.iso.org/standard/70484.html ISO/IEC 7812-1 (issuer identification numbers)
 */
export const isValidCreditCard = (value: string | number): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) return false;

	const checkDigit = digits.charCodeAt(digits.length - 1) - 48;

	return mod10(digits.slice(0, -1)) === checkDigit;
};
