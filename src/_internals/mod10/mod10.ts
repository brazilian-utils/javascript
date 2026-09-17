/**
 * Calculates the modulus 10 check digit for a given string.
 *
 * @param {string} str - The string to calculate the check digit for.
 * @returns {number} The calculated check digit (0-9).
 *
 * @example
 * ```typescript
 * mod10("001900000"); // 9
 * ```
 */
export const mod10 = (str: string): number => {
	let sum = 0;
	const len = str.length;
	for (let i = 0; i < len; i++) {
		const digit = str.charCodeAt(len - 1 - i) - 48;
		const result = digit * (i % 2 === 0 ? 2 : 1);
		sum += result > 9 ? result - 9 : result;
	}
	const mod = sum % 10;
	return mod > 0 ? 10 - mod : 0;
};
