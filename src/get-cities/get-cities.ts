import { DATA as CITIES_DATA } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";

export type { StateCode } from "../_internals/constants/states";

let allCitiesCache: string[] | undefined;

/**
 * Returns a list of city names for a given Brazilian state, or all cities if no state is specified.
 *
 * If a state code is provided, the function returns its cities sorted with `localeCompare`
 * in the "pt-BR" locale. If no state is provided, it returns all cities from all states,
 * sorted the same way so accented names land where a Brazilian reader expects them (the
 * combined, sorted list is computed once and cached; every call returns a fresh copy).
 *
 * Every falsy `state` asks for the full list, so `getCities(null)` and `getCities("")` return
 * every city. The sibling `getMunicipalities` is stricter and only reads an omitted (or
 * `undefined`) state code that way, returning `[]` for `null` and `""`.
 *
 * The state code is matched exactly, case included: `getCities("sp")` returns `[]` where
 * `getCities("SP")` returns the 645 São Paulo cities. `getCities` and `getMunicipalities` are
 * the only state-taking lookups that are case-sensitive; `getStateNameByCode`,
 * `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality` all fold case.
 *
 * @param {StateCode} [state] - The code of the Brazilian state to filter cities by. Optional.
 * @returns {string[]} An array of city names, sorted alphabetically. Returns an empty array if the state is not found.
 *
 * @example
 * ```typescript
 * getCities("SP")[0]; // "Adamantina"
 * getCities("sp"); // [] (the state code is case-sensitive here)
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

	if (typeof state !== "string" || !Object.hasOwn(CITIES_DATA, state)) return [];

	return CITIES_DATA[state].map(([name]) => name);
};
