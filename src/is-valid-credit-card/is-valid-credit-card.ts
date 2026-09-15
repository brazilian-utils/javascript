import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { mod10 } from "../_internals/mod10/mod10";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { MAX_LENGTH, MIN_LENGTH } from "./constants";

const FORMAT_REGEX = /^\d+(?:[\s.\-/]+\d+)*$/;

/**
 * Validates a payment card number (crédito ou débito) using the Luhn algorithm.
 *
 * Accepts the usual mask characters (whitespace, `.`, `-` and `/`, the interchangeable set
 * `isValidCpf` and `isValidCnpj` accept) between digits, a run of them included, so
 * `"4111 - 1111 - 1111 - 1111"` reads as the same PAN, and whitespace around the value; any
 * other character makes the value invalid, so `"4111a1111b1111c1111"` is rejected instead of
 * being read as `"4111111111111111"`. They are accepted between any two digits rather than at
 * fixed positions: the printed grouping of a PAN changes with the brand (4-4-4-4 for Visa and
 * Mastercard, 4-6-5 for American Express, 4-6-4 for Diners Club), so there is no single layout
 * to pin them to. Only checks the digit count (12 to 19: 12 is
 * the de-facto industry minimum PAN length, e.g. Maestro, and ISO/IEC 7812-1 caps the PAN at 19)
 * and the Luhn check digit; it performs no brand detection (Visa, Mastercard, Amex...), issuer
 * range lookup or expiration/CVV checks.
 *
 * A value whose digits are all the same (`"0000000000000000"`) is rejected even when it passes
 * the Luhn check, as every other validator of this package rejects a repeated-digit document
 * (`isValidCpf("00000000000")`, `isValidCns`, `isValidCaepf`, `isValidCei`): no issuer hands out
 * such a PAN, and it is what a placeholder or a zero-filled field looks like.
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
 * isValidCreditCard("4111.1111/1111-1111"); // true (any of the mask characters)
 * isValidCreditCard("4111111111111112"); // false (bad check digit)
 * isValidCreditCard("0000000000000000"); // false (every digit the same, though the Luhn check passes)
 * isValidCreditCard("4111a1111b1111c1111"); // false (letters between the digits)
 * isValidCreditCard("123456789"); // false (too short)
 * isValidCreditCard(4111111111111111111); // false (above 2^53 - 1, pass it as a string)
 * ```
 *
 * ISO/IEC 7812-1 (issuer identification numbers) caps the PAN at 19 digits but sets no
 * minimum; the 12-digit floor here is the de-facto industry minimum (e.g. Maestro). The ISO
 * catalogue page sits behind a bot filter and answers HTTP 403 to every non-browser client, so
 * it has to be opened in a browser, where it renders the standard's paywalled abstract rather
 * than its text.
 *
 * @see Official: https://www.iso.org/standard/70484.html
 */
export const isValidCreditCard = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	if (!FORMAT_REGEX.test(value.toString().trim())) return false;

	const digits = sanitizeToDigits(value);

	if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) return false;

	if (isRepeatedDigits(digits)) return false;

	const checkDigit = digits.charCodeAt(digits.length - 1) - 48;

	return mod10(digits.slice(0, -1)) === checkDigit;
};
