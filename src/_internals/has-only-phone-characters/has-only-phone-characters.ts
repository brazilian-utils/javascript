const PHONE_CHARACTERS_REGEX = /^[\d\s()+./-]*$/;

/**
 * Checks that a phone value holds nothing but digits and the characters a phone number is
 * printed with: whitespace, parentheses, `+`, `.`, `-` and `/`. Any other character, a letter
 * for instance, means the value is not a phone number, even if the digits left after
 * sanitizing look like one.
 *
 * @param {string} value - The phone value to check.
 * @returns {boolean} True when every character is a digit, whitespace, or one of `()+.-/`.
 *
 * @example
 * ```typescript
 * hasOnlyPhoneCharacters("+55 (11) 98765-4321"); // true
 * hasOnlyPhoneCharacters("11.98765/4321"); // true
 * hasOnlyPhoneCharacters("11 98765-4321x"); // false
 * hasOnlyPhoneCharacters("tel 1130000000"); // false
 * ```
 */
export const hasOnlyPhoneCharacters = (value: string): boolean =>
	PHONE_CHARACTERS_REGEX.test(value);
