const EMAIL_REGEX =
	/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;

/**
 * Validates if an email address is valid.
 *
 * @param {string} value - The email address to be validated.
 * @returns {boolean} True if the email is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidEmail("user@example.com"); // true
 * isValidEmail("invalid.email"); // false
 * isValidEmail("test@domain.co.uk"); // true
 * ```
 *
 * @see Based on: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address The
 * WHATWG HTML "valid e-mail address" definition, narrowed further: the local part is limited to
 * letters, digits and `_'+-.`, it may not start with a dot or contain two dots in a row, and the
 * domain must carry at least one dot and end in an alphabetic label of two or more letters. It is
 * a practical subset, not RFC 5322: quoted local parts and address literals are rejected.
 */
export const isValidEmail = (value: string): boolean => {
	if (typeof value !== "string") return false;

	return EMAIL_REGEX.test(value);
};
