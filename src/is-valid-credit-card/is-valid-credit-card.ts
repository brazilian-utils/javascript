import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { mod10 } from "../_internals/mod10/mod10";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { MAX_LENGTH, MIN_LENGTH } from "./constants";

const FORMAT_REGEX = /^\d+(?:[ -]+\d+)*$/;

/**
 * Validates a payment card number (crédito ou débito) using the Luhn algorithm.
 *
 * Accepts the usual mask characters (spaces and hyphens) between digits, a run of them included,
 * so `"4111 - 1111 - 1111 - 1111"` reads as the same PAN, and whitespace around the value; any
 * other character makes the value invalid, so `"4111a1111b1111c1111"` is rejected instead of
 * being read as `"4111111111111111"`. Only checks the digit count (12 to 19: 12 is
 * the de-facto industry minimum PAN length, e.g. Maestro, and ISO/IEC 7812-1 caps the PAN at 19)
 * and the Luhn check digit; it performs no brand detection (Visa, Mastercard, Amex...), issuer
 * range lookup or expiration/CVV checks.
 *
 * A number is only accepted when it is a non-negative safe integer: a card number above
 * `Number.MAX_SAFE_INTEGER` (2^53 - 1, 16 digits) has already been rounded to a different
 * number by the time it arrives, and a negative one is not a PAN, so both are rejected rather
 * than validated as digits the caller never wrote. Pass a longer PAN as a string.
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
 * isValidCreditCard("4111 - 1111 - 1111 - 1111"); // true (a run of separators between the digits)
 * isValidCreditCard("4111111111111112"); // false (bad check digit)
 * isValidCreditCard("4111a1111b1111c1111"); // false (letters between the digits)
 * isValidCreditCard("123456789"); // false (too short)
 * isValidCreditCard(4111111111111111111); // false (above 2^53 - 1, pass it as a string)
 * ```
 *
 * ISO/IEC 7812-1 (issuer identification numbers) caps the PAN at 19 digits but sets no
 * minimum; the 12-digit floor here is the de-facto industry minimum (e.g. Maestro).
 *
 * @see Official: https://www.iso.org/standard/70484.html
 */
export const isValidCreditCard = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	if (!FORMAT_REGEX.test(value.toString().trim())) return false;

	const digits = sanitizeToDigits(value);

	if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) return false;

	const checkDigit = digits.charCodeAt(digits.length - 1) - 48;

	return mod10(digits.slice(0, -1)) === checkDigit;
};
