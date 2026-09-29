import { calculateMunicipalityCheckDigit } from "../calculate-municipality-check-digit/calculate-municipality-check-digit";
import { MUNICIPALITY_CODES } from "../constants/municipality-codes";
import { type StateCode } from "../constants/states";

const cache: Partial<Record<StateCode, readonly string[]>> = {};

/**
 * Unpacks the IBGE codes of the municipalities of a state, in the order of their names, out of
 * `MUNICIPALITY_CODES` (`scripts/cities.ts` packs them). Each entry is the difference of the
 * first 6 digits of the code from the one before it, in base 36, and the seventh digit is the
 * check digit unless a dot and another digit follow. The state is unpacked on its first lookup,
 * and the same array is handed back after that, so a caller must not change it.
 *
 * @param {StateCode} stateCode - The state whose municipalities to read.
 * @returns {readonly string[]} The 7 digit codes, at the index of the name of each municipality.
 *
 * @example
 * ```typescript
 * readMunicipalityCodes("DF"); // ["5300108"]
 * ```
 */
export const readMunicipalityCodes = (stateCode: StateCode): readonly string[] => {
	const cached = cache[stateCode];

	if (cached !== undefined) return cached;

	let previous = 0;
	const codes = MUNICIPALITY_CODES[stateCode].split(",").map((entry) => {
		const dot = entry.indexOf(".");

		previous += Number.parseInt(entry, 36);

		const code = String(previous);

		return `${code}${dot === -1 ? calculateMunicipalityCheckDigit(code) : entry.slice(dot + 1)}`;
	});

	cache[stateCode] = codes;

	return codes;
};
