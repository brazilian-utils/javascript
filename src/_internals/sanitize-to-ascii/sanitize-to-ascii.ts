const COMBINING_MARKS_REGEX = /[\u0300-\u036F]/g;

const NON_PRINTABLE_ASCII_REGEX = /[^\u0020-\u007E]/g;

const WHITESPACE_REGEX = /\s+/g;

/**
 * Folds a string down to printable ASCII: accented letters lose their diacritics, anything
 * still outside the printable ASCII range is dropped and runs of whitespace collapse into a
 * single space.
 *
 * @param {string} value - The value to fold.
 * @returns {string} The trimmed, printable ASCII form of the value.
 *
 * @example
 * ```typescript
 * sanitizeToAscii("São Paulo"); // "Sao Paulo"
 * sanitizeToAscii("  Fulano   de Tal  "); // "Fulano de Tal"
 * ```
 */
export const sanitizeToAscii = (value: string): string =>
	value
		.normalize("NFD")
		.replace(COMBINING_MARKS_REGEX, "")
		.replace(NON_PRINTABLE_ASCII_REGEX, "")
		.replace(WHITESPACE_REGEX, " ")
		.trim();
