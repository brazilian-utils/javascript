import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../constants/voter-id";

const SEQUENTIAL_LENGTH = 8;

export type CalculateVoterIdFirstDigitParams = {
	/** The sequential part of the voter ID, 8 digits (9 for some São Paulo/Minas Gerais ids). */
	sequentialNumber: string;
	/** The 2 digit federative unit code of the voter ID. */
	federativeUnion: string;
};

/**
 * Calculates the first verification digit of a Brazilian voter id (título de eleitor).
 *
 * The first eight sequential digits are weighted 2..9 from left to right and summed modulo
 * 11. São Paulo (01) and Minas Gerais (02) issued some ids with a nine digit sequential
 * number; the check digits of those ids are still computed from the first eight digits, the
 * ninth one is not part of the calculation (brutils does the same).
 *
 * @param {CalculateVoterIdFirstDigitParams} params - The calculation parameters.
 * @param {string} params.sequentialNumber - The 8 or 9 digit sequential number; only the first 8 digits count.
 * @param {string} params.federativeUnion - The 2-digit federative union code.
 * @returns {number} The calculated first verification digit (0-9).
 *
 * @example
 * ```typescript
 * calculateVoterIdFirstDigit({ sequentialNumber: "10238501", federativeUnion: "06" }); // 7
 * ```
 */
export const calculateVoterIdFirstDigit = ({
	sequentialNumber,
	federativeUnion,
}: CalculateVoterIdFirstDigitParams): number => {
	// The weighted sum is written out rather than delegated to the shared `generateChecksum`: its
	// sanitizer chain costs `isValidVoterId` and `generateVoterId` around 285 B of bundle each.
	let sum = 0;

	for (let i = 0; i < SEQUENTIAL_LENGTH; i++) {
		// Stryker disable next-line ArithmeticOperator: charCodeAt(i)+48 shifts each digit by 96; with weights 2..9 (summing to 44) the total shift is 96*44=4224=384*11, a multiple of 11, so the mod-11 result is unaffected.
		sum += (sequentialNumber.charCodeAt(i) - 48) * (i + 2);
	}

	const remainder = sum % 11;

	if (remainder === 0 && NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion)) {
		return 1;
	}

	return remainder === 10 ? 0 : remainder;
};
