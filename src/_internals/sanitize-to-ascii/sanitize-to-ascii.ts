const WHITESPACE_REGEX = /\s/g;

const NON_PRINTABLE_ASCII_REGEX = /[^\u0020-\u007E]/g;

const SPACE_RUN_REGEX = / {2,}/g;

/**
 * Folds a string down to printable ASCII: accented letters lose their diacritics, anything
 * still outside the printable ASCII range is dropped and runs of whitespace collapse into a
 * single space.
 *
 * Whitespace is normalized before the non-ASCII characters are dropped, so a non-breaking
 * space (or any other Unicode space) still separates the words around it instead of vanishing
 * and gluing them together.
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
		.replace(WHITESPACE_REGEX, " ")
		.replace(NON_PRINTABLE_ASCII_REGEX, "")
		.replace(SPACE_RUN_REGEX, " ")
		.trim();
