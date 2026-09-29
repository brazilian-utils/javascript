import { DATA as CITIES_DATA } from "../constants/municipalities";
import { MUNICIPALITY_AREA_CODES } from "../constants/municipality-area-codes";
import { type StateCode } from "../constants/states";

const AREA_CODE_LENGTH = 2;

const indexes: Partial<Record<StateCode, Record<string, number>>> = {};

const buildIndex = (stateCode: StateCode): Record<string, number> => {
	const areaCodes = MUNICIPALITY_AREA_CODES[stateCode];
	const codes = CITIES_DATA[stateCode].map(([, municipalityCode]) => municipalityCode).sort();

	return Object.fromEntries(
		codes.map((municipalityCode, position) => {
			const start = position * AREA_CODE_LENGTH;

			return [municipalityCode, Number(areaCodes.slice(start, start + AREA_CODE_LENGTH))];
		}),
	);
};

/**
 * Reads the DDD of a municipality out of `MUNICIPALITY_AREA_CODES`, which holds the DDDs of each
 * state in ascending order of the municipality code. The DDDs of each state are indexed by
 * municipality code on its first lookup, and the index is kept.
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
	indexes[stateCode] ??= buildIndex(stateCode);

	return indexes[stateCode][code];
};
