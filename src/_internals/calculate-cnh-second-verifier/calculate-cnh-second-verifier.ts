export type CalculateCnhSecondVerifierParams = {
	/** The 9 digit CNH registry number. */
	base: string;
	/** The correction the first verifier reported, 0 or 2. */
	decrement: number;
};

/**
 * Calculates the second verification digit of a Brazilian CNH (Carteira Nacional de Habilitação)
 * from its 9-digit base number and the decrement produced by `calculateCnhFirstVerifier`.
 *
 * @param {CalculateCnhSecondVerifierParams} params - The calculation parameters.
 * @param {string} params.base - The 9-digit CNH base number.
 * @param {number} params.decrement - The decrement calculated alongside the first verification digit.
 * @returns {number} The calculated second verification digit (0-9).
 *
 * @example
 * ```typescript
 * calculateCnhSecondVerifier({ base: "000000093", decrement: 2 }); // 9
 * ```
 */
export const calculateCnhSecondVerifier = ({
	base,
	decrement,
}: CalculateCnhSecondVerifierParams): number => {
	let sum = 0;

	for (let i = 0; i < 9; i++) {
		sum += (base.charCodeAt(i) - 48) * (i + 1);
	}

	let secondVerifier = ((sum % 11) - decrement + 11) % 11;

	if (secondVerifier >= 10) secondVerifier = 0;

	return secondVerifier;
};
