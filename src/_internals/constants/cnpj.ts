/** Characters of a CNPJ (numeric or alphanumeric). */
export const CNPJ_LENGTH = 14;

export const CNPJ_FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const CNPJ_SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Whether a sanitized CNPJ carries a letter, which makes it alphanumeric. The root and the branch
 * take the digits `0` to `9` and the upper case letters `A` to `Z`, so the sanitized value is
 * upper cased before the test. Shared by `isValidCnpj` and `getCnpjInfo`.
 */
export const CNPJ_LETTER_REGEX = /[A-Z]/;
