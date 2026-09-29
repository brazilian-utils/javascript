/**
 * Mask characters (whitespace, dot, hyphen, slash) tolerated in a formatted identifier, the same
 * interchangeable set `isValidCpf` reads between its groups.
 */
export const SEPARATORS_REGEX = /[\s.\-/]/g;
