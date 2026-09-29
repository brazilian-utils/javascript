import { DATA as CITIES_DATA } from "../_internals/constants/municipalities";
import { type StateCode } from "../_internals/constants/states";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeStateCode } from "../_internals/normalize-state-code/normalize-state-code";

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
 * The state code is matched ignoring letter case and surrounding whitespace, like every other
 * state util: `getCities("sp")` returns the 645 São Paulo cities, as `"SP"` does. Up to 2.4.0 the
 * match was case-sensitive and `"sp"` returned `[]`.
 *
 * @deprecated Use `getMunicipalities` instead.
 *
 * @param {StateCode} [state] - The code of the Brazilian state to filter cities by. Optional.
 * @returns {string[]} An array of city names, sorted alphabetically. Returns an empty array if the state is not found.
 *
 * @example
 * ```typescript
 * getCities("SP")[0]; // "Adamantina"
 * getCities("sp").length; // 645 (case and surrounding whitespace are ignored)
 * getCities().length; // every city of every state
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025 (data base 31/12/2025): the same 5,571 municipality
 * codes as the bundled table.
 */
export const getCities = (state?: StateCode): string[] => {
	if (!state) {
		allCitiesCache ??= Object.values(CITIES_DATA)
			.flat()
			.map(([name]) => name)
			.sort((a, b) => a.localeCompare(b, "pt-BR"));

		return [...allCitiesCache];
	}

	const code = normalizeStateCode(state);

	return hasOwnKey(CITIES_DATA, code) ? CITIES_DATA[code].map(([name]) => name) : [];
};
