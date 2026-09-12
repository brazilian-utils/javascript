import { DATA as CITIES_DATA } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";

let allCitiesCache: string[] | undefined;

/**
 * Returns a list of city names for a given Brazilian state, or all cities if no state is specified.
 *
 * If a state code is provided, the function returns its cities sorted alphabetically.
 * If no state is provided, it returns all cities from all states, sorted with
 * `localeCompare` in the "pt-BR" locale so accented names land where a Brazilian reader
 * expects them (the combined, sorted list is computed once and cached; every call returns
 * a fresh copy).
 *
 * @param {StateCode} [state] - The code of the Brazilian state to filter cities by. Optional.
 * @returns {string[]} An array of city names, sorted alphabetically. Returns an empty array if the state is not found.
 *
 * @example
 * ```typescript
 * getCities("SP")[0]; // "Adamantina"
 * getCities().length; // every city of every state
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getCities = (state?: StateCode): string[] => {
	if (!state) {
		allCitiesCache ??= Object.values(CITIES_DATA)
			.flat()
			.map(([name]) => name)
			.sort((a, b) => a.localeCompare(b, "pt-BR"));

		return [...allCitiesCache];
	}

	if (!Object.hasOwn(CITIES_DATA, state)) return [];

	return CITIES_DATA[state].map(([name]) => name);
};
