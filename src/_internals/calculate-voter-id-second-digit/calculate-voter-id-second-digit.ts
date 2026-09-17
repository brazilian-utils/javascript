import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../constants/voter-id";

export type CalculateVoterIdSecondDigitParams = {
	/** The 2 digit federative unit code of the voter ID. */
	federativeUnion: string;
	/** The first check digit, 0 to 9. */
	firstDigit: number;
};

/**
 * Calculates the second verification digit of a Brazilian voter id (título de eleitor).
 *
 * @param {CalculateVoterIdSecondDigitParams} params - The calculation parameters.
 * @param {string} params.federativeUnion - The 2-digit federative union code.
 * @param {number} params.firstDigit - The previously calculated first verification digit.
 * @returns {number} The calculated second verification digit (0-9).
 *
 * @example
 * ```typescript
 * calculateVoterIdSecondDigit({ federativeUnion: "06", firstDigit: 7 }); // 1
 * ```
 */
export const calculateVoterIdSecondDigit = ({
	federativeUnion,
	firstDigit,
}: CalculateVoterIdSecondDigitParams): number => {
	const sum =
		(federativeUnion.charCodeAt(0) - 48) * 7 +
		(federativeUnion.charCodeAt(1) - 48) * 8 +
		firstDigit * 9;

	const remainder = sum % 11;

	if (remainder === 0 && NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion)) {
		return 1;
	}

	return remainder === 10 ? 0 : remainder;
};
