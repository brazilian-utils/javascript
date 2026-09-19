import * as fc from "fast-check";

import { UF_TO_VOTER_ID_CODE } from "../../is-valid-voter-id/constants";
import { calculateProcessoJuridicoCheckDigits } from "../calculate-processo-juridico-check-digits/calculate-processo-juridico-check-digits";
import { calculateVoterIdFirstDigit } from "../calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { PROCESSO_JURIDICO_TRIBUNALS } from "../constants/processo-juridico";
import { type StateCode } from "../constants/states";
import { digits } from "./arbitraries";

/** Arbitraries of valid voter IDs and processo numbers; see `document-arbitraries.ts`. */

/**
 * @param {StateCode | "ZZ"} [state] The state the voter IDs belong to; any of them by default.
 * @returns {fc.Arbitrary<string>} Valid voter IDs, unmasked.
 */
export const voterIds = (state?: StateCode | "ZZ"): fc.Arbitrary<string> =>
	fc
		.tuple(
			digits(8),
			state === undefined
				? fc.constantFrom(...Object.values(UF_TO_VOTER_ID_CODE))
				: fc.constant(UF_TO_VOTER_ID_CODE[state]),
		)
		.map(([sequentialNumber, federativeUnion]) => {
			const firstDigit = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
			const secondDigit = calculateVoterIdSecondDigit({ federativeUnion, firstDigit });
			return `${sequentialNumber}${federativeUnion}${firstDigit}${secondDigit}`;
		});

/**
 * @returns {fc.Arbitrary<string>} Valid CNJ processo numbers, unmasked, with the órgão and the
 * tribunal drawn from the pairs Resolução CNJ nº 65/2008 allows.
 */
export const processosJuridicos = (): fc.Arbitrary<string> => {
	const courtsAndTribunals = [...PROCESSO_JURIDICO_TRIBUNALS].flatMap(([court, tribunals]) =>
		tribunals.map((tribunal) => `${court}${String(tribunal).padStart(2, "0")}`),
	);

	return fc
		.tuple(
			digits(7),
			fc.integer({ min: 1000, max: 9999 }),
			fc.constantFrom(...courtsAndTribunals),
			digits(4),
		)
		.map(([sequential, year, courtAndTribunal, origin]) => {
			const tail = `${year}${courtAndTribunal}${origin}`;
			const checkDigits = calculateProcessoJuridicoCheckDigits(sequential + tail);
			return `${sequential}${String(checkDigits).padStart(2, "0")}${tail}`;
		});
};
