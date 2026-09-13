const EMAIL_REGEX =
	/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

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
 * The WHATWG HTML "valid e-mail address" definition is narrowed further: the local part is
 * limited to letters, digits and `_'+-.`, it may not start with a dot or contain two dots in a
 * row, and the domain must carry at least one dot and end in an alphabetic label of two or more
 * letters. Each dotted label follows the WHATWG production `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?`,
 * so a label may neither start nor end with a hyphen nor exceed 63 characters. It is a practical
 * subset of that WHATWG definition, not of IETF RFC 5322: quoted local parts and address
 * literals are rejected.
 *
 * @see Official: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 * @see Official: https://www.rfc-editor.org/rfc/rfc5322
 */
export const isValidEmail = (value: string): boolean => {
	if (typeof value !== "string") return false;

	return EMAIL_REGEX.test(value);
};
