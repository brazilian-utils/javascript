/** Mask characters (whitespace, dot, hyphen) tolerated in a formatted identifier. */
export const SEPARATORS_REGEX = /[\s.-]/g;

/**
 * Mask characters (whitespace, hyphen) tolerated in a lookup code. A dot is left out: no code
 * looked up this way is printed with one, and `"1.0"` reads as a decimal number, not as the
 * code `10`.
 */
export const LOOKUP_SEPARATORS_REGEX = /[\s-]/g;
