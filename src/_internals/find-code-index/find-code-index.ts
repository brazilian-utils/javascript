/**
 * Finds a code in a table of fixed-width codes written back to back in one string (`"111105"` +
 * `"111110"` + ...), the form the generated lookup tables ship their codes in: a validator bundles
 * that string alone, and a getter reads the description at the same index of the aligned
 * descriptions array, which only the getter bundles.
 *
 * Only a match that starts on a code boundary counts, so a code is never found across two
 * neighbours (`"0510"` in `"10510599"`).
 *
 * @param {string} codes - The codes of the table, every one `code.length` characters long.
 * @param {string} code - The code to look for, never empty, already normalized to the width of
 * the table.
 * @returns {number} The index of the code in the table, `-1` when it is not listed.
 *
 * @example
 * ```typescript
 * findCodeIndex("001003004", "003"); // 1
 * findCodeIndex("001003004", "010"); // -1, the "010" that runs across "001" and "003" is no code
 * ```
 */
export const findCodeIndex = (codes: string, code: string): number => {
	// Stryker disable next-line EqualityOperator: every code is `code.length` characters long, so the extra iteration `<=` adds starts at the end of `codes`, where no code can start.
	for (let index = 0; index < codes.length; index += code.length) {
		if (codes.startsWith(code, index)) return index / code.length;
	}

	return -1;
};
