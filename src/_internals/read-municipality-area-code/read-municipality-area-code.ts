import { DATA as CITIES_DATA } from "../constants/municipalities";
import { MUNICIPALITY_AREA_CODES } from "../constants/municipality-area-codes";
import { type StateCode } from "../constants/states";

const AREA_CODE_LENGTH = 2;

const sortedCodes = new Map<StateCode, string[]>();

/**
 * Reads the DDD of a municipality out of `MUNICIPALITY_AREA_CODES`, which holds the DDDs of each
 * state in ascending order of the municipality code. The sorted codes of each state are built on
 * its first lookup and kept.
 *
 * @param {StateCode} stateCode - The state of the municipality.
 * @param {string} code - The 7 digit IBGE code of a municipality of that state.
 * @returns {number} The DDD of the municipality.
 *
 * @example
 * ```typescript
 * readMunicipalityAreaCode("SP", "3550308"); // 11
 * ```
 */
export const readMunicipalityAreaCode = (stateCode: StateCode, code: string): number => {
	let codes = sortedCodes.get(stateCode);

	// Stryker disable next-line ConditionalExpression: this guard only memoizes; CITIES_DATA is a module level constant that is never written to, so sorting the codes again on every lookup gives the same array, and the repeated work is unobservable.
	if (codes === undefined) {
		codes = CITIES_DATA[stateCode].map(([, municipalityCode]) => municipalityCode).sort();
		sortedCodes.set(stateCode, codes);
	}

	const start = codes.indexOf(code) * AREA_CODE_LENGTH;

	return Number(MUNICIPALITY_AREA_CODES[stateCode].slice(start, start + AREA_CODE_LENGTH));
};
