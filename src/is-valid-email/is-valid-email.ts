const EMAIL_REGEX =
	/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{0,58}[a-z0-9])$/i;

const MAX_LOCAL_PART_LENGTH = 64;

const MAX_ADDRESS_LENGTH = 254;

/**
 * Validates if an email address is valid.
 *
 * The WHATWG HTML "valid e-mail address" definition is narrowed further: the local part is
 * limited to letters, digits and `_'+-.`, it may not start with a dot, end with a dot or an
 * apostrophe, or contain two dots in a row, and the domain must carry at least one dot and end
 * in an alphabetic label of 2 to 63 letters, or in a punycode label (`xn--`) of up to 63
 * characters. Each dotted label follows the WHATWG production
 * `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?`, so a label may neither start nor end with a
 * hyphen nor exceed 63 characters. The local part is capped at 64 characters and the whole
 * address at 254, the limits of RFC 5321 section 4.5.3.1 (up to 2.4.0 there was no cap on either).
 * It is a practical subset of that WHATWG definition, not of IETF RFC 5322: quoted local parts,
 * address literals, single label domains such as `user@localhost` and the local part characters
 * `! # $ % & * = ? ^ { | } ~`, the slash and the backtick are rejected.
 *
 * @param {string} value - The email address to be validated.
 * @returns {boolean} True if the email is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidEmail("user@example.com"); // true
 * isValidEmail("invalid.email"); // false
 * isValidEmail("test@domain.co.uk"); // true
 * isValidEmail("user@example.xn--p1ai"); // true (punycode top-level domain)
 * isValidEmail(`${"a".repeat(65)}@example.com`); // false (local part over 64 characters)
 * ```
 *
 * @see Official: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 * @see Official: https://www.rfc-editor.org/rfc/rfc5322
 * @see Official: https://www.rfc-editor.org/rfc/rfc5321#section-4.5.3.1
 */
export const isValidEmail = (value: string): boolean => {
	if (typeof value !== "string") return false;

	if (value.length > MAX_ADDRESS_LENGTH) return false;

	if (value.indexOf("@") > MAX_LOCAL_PART_LENGTH) return false;

	return EMAIL_REGEX.test(value);
};
