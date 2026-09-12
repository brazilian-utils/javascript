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
 * @see Official: https://www.rfc-editor.org/rfc/rfc5322
 */
export const isValidEmail = (value: string): boolean => {
	if (typeof value !== "string") return false;

	return EMAIL_REGEX.test(value);
};
