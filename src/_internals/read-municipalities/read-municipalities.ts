import { MUNICIPALITY_NAMES } from "../constants/municipality-names";
import { type StateCode } from "../constants/states";
import { readMunicipalityCodes } from "../read-municipality-codes/read-municipality-codes";

const cache: Partial<Record<StateCode, readonly (readonly [string, string])[]>> = {};

/**
 * Reads the municipalities of a state as `[name, ibgeCode]` pairs, sorted by name with
 * `localeCompare` in the "pt-BR" locale, out of `MUNICIPALITY_NAMES` and `MUNICIPALITY_CODES`.
 * The state is read on its first lookup, and the same array is handed back after that, so a
 * caller must not change it.
 *
 * @param {StateCode} stateCode - The state whose municipalities to read.
 * @returns {readonly (readonly [string, string])[]} The `[name, ibgeCode]` pair of each municipality.
 *
 * @example
 * ```typescript
 * readMunicipalities("DF"); // [["Brasília", "5300108"]]
 * ```
 */
export const readMunicipalities = (
	stateCode: StateCode,
): readonly (readonly [string, string])[] => {
	const cached = cache[stateCode];

	if (cached !== undefined) return cached;

	const codes = readMunicipalityCodes(stateCode);
	const municipalities = MUNICIPALITY_NAMES[stateCode]
		.split("|")
		.map((name, index): readonly [string, string] => [name, codes[index]]);

	cache[stateCode] = municipalities;

	return municipalities;
};
