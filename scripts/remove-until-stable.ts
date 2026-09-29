/**
 * Removes every match of `pattern` repeatedly until nothing changes, so nested or overlapping
 * matches cannot survive a single pass. Shared by the scripts that strip markup out of text.
 *
 * @param {string} value - The string to strip matches from.
 * @param {RegExp} pattern - The pattern to remove, repeatedly.
 * @returns {string} `value` with every match of `pattern` removed.
 */
export const removeUntilStable = (value: string, pattern: RegExp): string => {
	let current = value;
	let previous = "";

	while (current !== previous) {
		previous = current;
		current = current.replace(pattern, "");
	}

	return current;
};
