export const EMAIL_MAX_LENGTH = 77;

/**
 * A DICT random key (EVP) is a lowercase UUID written with its punctuation. The DICT issues
 * version 4 UUIDs, but neither the registered pattern nor the example of the manual
 * (`123e4567-e12b-12d1-a456-426655440000`, whose version nibble is `1`) constrains the
 * version, so the version and variant nibbles are not enforced.
 */
export const EVP_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marks of a value written as a phone number rather than as a document: an explicit
 * international prefix (`+55` or `0055`) or a DDD wrapped in parentheses. A CPF mask uses only
 * dots and a dash, so it never matches.
 */
export const PHONE_HINT_REGEX = /^(?:\+|00)\s*55|[()]/;
