/** Digits of an ISBN-13. */
export const ISBN_LENGTH = 13;

/**
 * The label an ISBN is printed after ("ISBN 978-65-89999-01-0"), with the "-13" suffix and the
 * colon some catalogues add, read case-insensitively.
 */
export const ISBN_LABEL_REGEX = /^\s*isbn(?:-13)?:?/i;
