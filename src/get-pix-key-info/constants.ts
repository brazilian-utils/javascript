export const EMAIL_MAX_LENGTH = 77;

/**
 * A DICT random key (EVP) is a lowercase UUID written with its punctuation. The DICT issues
 * version 4 UUIDs, but neither the registered pattern nor the example of the manual
 * (`123e4567-e12b-12d1-a456-426655440000`, whose version nibble is `1`) constrains the
 * version, so the version and variant nibbles are not enforced.
 */
export const EVP_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The characters a value written as a phone number may carry: digits, the `+` of the
 * international prefix and the spaces, dots, hyphens and parentheses of the usual masks.
 * Sanitizing to digits alone would read `"abc(11) 98765-4321xyz"` as a phone number, so the
 * value is matched against this before it is sanitized.
 */
export const PHONE_SYNTAX_REGEX = /^[\d ()+.-]+$/;

/**
 * The forms a value written as a CPF may take: the bare 11 digits or the documented mask, with
 * the dots and the hyphen optional and a space accepted wherever a separator goes. Sanitizing
 * to digits alone would read `"abc123.456.789-09"` as a CPF, so the value is matched against
 * this before it is sanitized.
 */
export const CPF_SYNTAX_REGEX = /^\d{3}[ .]?\d{3}[ .]?\d{3}[ -]?\d{2}$/;
