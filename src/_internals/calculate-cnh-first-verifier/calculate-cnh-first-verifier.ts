export type CnhFirstVerifier = {
	/** The first check digit, 0 to 9. */
	firstVerifier: number;
	/** The correction to apply to the second verifier, 0 or 2. */
	decrement: number;
};

/**
 * Calculates the first verification digit of a Brazilian CNH (Carteira Nacional de Habilitação)
 * from its 9-digit base number.
 *
 * @param {string} base - The 9-digit CNH base number.
 * @returns {CnhFirstVerifier} The first verification digit and the decrement that must be
 * applied when calculating the second verification digit.
 *
 * @example
 * ```typescript
 * calculateCnhFirstVerifier("000000093"); // { firstVerifier: 0, decrement: 2 }
 * ```
 */
export const calculateCnhFirstVerifier = (base: string): CnhFirstVerifier => {
	// The weighted sum is written out rather than delegated to the shared `generateChecksum`: its
	// sanitizer chain costs `isValidCnh` and `generateCnh` around 240 B of bundle each.
	let sum = 0;

	for (let i = 0; i < 9; i++) {
		sum += (base.charCodeAt(i) - 48) * (9 - i);
	}

	const remainder = sum % 11;

	if (remainder >= 10) return { firstVerifier: 0, decrement: 2 };

	return { firstVerifier: remainder, decrement: 0 };
};
