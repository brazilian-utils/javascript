import { MUNICIPALITY_AREA_CODES } from "../constants/municipality-area-codes";
import { type StateCode } from "../constants/states";
import { hasOwnKey } from "../has-own-key/has-own-key";
import { readMunicipalityCodes } from "../read-municipality-codes/read-municipality-codes";

const AREA_CODE_LENGTH = 2;

const indexes: Partial<Record<StateCode, Record<string, number | undefined>>> = {};

const buildIndex = (stateCode: StateCode): Record<string, number | undefined> => {
	const areaCodes = MUNICIPALITY_AREA_CODES[stateCode];
	const codes = [...readMunicipalityCodes(stateCode)].sort();

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
 * municipality code on its first lookup, and the index is kept. A code that is not an own key
 * of the index (`"constructor"`, for instance) gives `undefined`, never an inherited member.
 *
 * @param {StateCode} stateCode - The state of the municipality.
 * @param {string} code - The 7 digit IBGE code of a municipality of that state.
 * @returns {number | undefined} The DDD of the municipality, `undefined` when the state has no
 * municipality of that code.
 *
 * @example
 * ```typescript
 * readMunicipalityAreaCode("SP", "3550308"); // 11
 * ```
 */
export const readMunicipalityAreaCode = (
	stateCode: StateCode,
	code: string,
): number | undefined => {
	indexes[stateCode] ??= buildIndex(stateCode);

	const index = indexes[stateCode];

	return hasOwnKey(index, code) ? index[code] : undefined;
};
