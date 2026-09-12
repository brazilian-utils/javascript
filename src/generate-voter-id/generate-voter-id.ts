import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { type StateCode } from "../_internals/constants/states";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { UF_TO_VOTER_ID_CODE } from "../is-valid-voter-id/constants";

/**
 * Generates a valid random Brazilian voter id (título de eleitor).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {StateCode | "ZZ"} state - Optional. The Brazilian state code to generate a voter id
 * for, or `"ZZ"` for a voter id issued abroad. Defaults to `"ZZ"` when omitted or unknown.
 * @returns {string} A valid 12-digit voter id string without formatting.
 *
 * @example
 * ```typescript
 * generateVoterId(); // "123456782897" (abroad, UF "28")
 * generateVoterId("SP"); // "123456780191" (UF "01")
 * generateVoterId("XX" as StateCode); // falls back to "ZZ" instead of throwing
 * ```
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2003/resolucao-no-21-538-de-14-de-outubro-de-2003
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/
 */
export const generateVoterId = (
	// Stryker disable next-line StringLiteral: any default other than a valid key still falls through the ?? UF_TO_VOTER_ID_CODE.ZZ lookup below, so the literal default value is unobservable.
	state: StateCode | "ZZ" = "ZZ",
): string => {
	const federativeUnion = UF_TO_VOTER_ID_CODE[state] ?? UF_TO_VOTER_ID_CODE.ZZ;
	const sequentialNumber = generateRandomNumber(8);
	const digit1 = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
	const digit2 = calculateVoterIdSecondDigit({ federativeUnion, firstDigit: digit1 });

	return `${sequentialNumber}${federativeUnion}${digit1}${digit2}`;
};
