/**
 * Calculates the check digit of an IBGE municipality code: the digits of the first 6 count once
 * at even positions and twice at odd positions, a product above 9 counts as the sum of its
 * digits, and the check digit completes the total to a multiple of 10. A few municipality codes
 * do not follow this rule, so the digit it gives is the usual one, not a guarantee.
 *
 * @param {string} code - The first 6 digits of a municipality code.
 * @returns {number} The check digit the rule gives.
 *
 * @example
 * ```typescript
 * calculateMunicipalityCheckDigit("355030"); // 8
 * ```
 */
export const calculateMunicipalityCheckDigit = (code: string): number => {
	let sum = 0;

	for (let index = 0; index < code.length; index += 1) {
		const product = Number(code.charAt(index)) * (index % 2 === 0 ? 1 : 2);

		sum += product > 9 ? product - 9 : product;
	}

	return (10 - (sum % 10)) % 10;
};
