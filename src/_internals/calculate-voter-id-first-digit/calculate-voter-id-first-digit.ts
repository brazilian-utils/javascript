import { REMAINDER_ZERO_FEDERATIVE_UNION_CODES } from "../constants/voter-id";

const SEQUENTIAL_LENGTH = 8;

export type CalculateVoterIdFirstDigitParams = {
	/** The sequential part of the voter ID, 8 digits with its leading zeros. */
	sequentialNumber: string;
	/** The 2 digit federative unit code of the voter ID. */
	federativeUnion: string;
};

/**
 * Calculates the first verification digit of a Brazilian voter id (título de eleitor).
 *
 * Resolução TSE nº 23.659/2021, art. 36, computes it over the sequential number, "o primeiro
 * calculado sobre o número sequencial": its eight digits are weighted 2..9 from left to right
 * and summed modulo 11. The weights and the remainder rules are not published by the TSE and
 * follow the community references the voter id functions cite as `Based on:`.
 *
 * @param {CalculateVoterIdFirstDigitParams} params - The calculation parameters.
 * @param {string} params.sequentialNumber - The 8 digit sequential number, leading zeros included.
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

	if (remainder === 0 && REMAINDER_ZERO_FEDERATIVE_UNION_CODES.includes(federativeUnion)) {
		return 1;
	}

	return remainder === 10 ? 0 : remainder;
};
