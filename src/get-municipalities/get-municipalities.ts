import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";
import { getStates } from "../get-states/get-states";

export type { Municipality } from "../_internals/constants/cities";
export type { StateCode } from "../_internals/constants/states";

const buildMunicipalities = (stateCode: StateCode): Municipality[] =>
	CITIES_DATA[stateCode].map(([name, code]) => ({ code, name, stateCode }));

/**
 * Returns Brazilian municipalities published by the IBGE, optionally filtered by state.
 *
 * If `stateCode` is provided, only municipalities of that state are returned. If it is
 * omitted, every municipality of every state is returned, sorted with `localeCompare` in the
 * "pt-BR" locale so accented names land where a Brazilian reader expects them. Every per-state
 * list is sorted the same way.
 *
 * Only an omitted (or `undefined`) `stateCode` asks for the full list: any other value that is
 * not a known state code, `null` and `""` included, returns `[]`. The sibling `getCities` is
 * looser and treats every falsy `state` as "no state given", so `getCities(null)` returns the
 * full list where `getMunicipalities(null)` returns `[]`.
 *
 * @param {StateCode} [stateCode] - The two letter code of the Brazilian state to filter by.
 * @returns {Municipality[]} A fresh array of fresh `Municipality` objects. Empty when
 * `stateCode` is not a known state.
 *
 * @example
 * ```typescript
 * getMunicipalities("SP")[0]; // { code: "3500105", name: "Adamantina", stateCode: "SP" }
 * getMunicipalities().length; // every municipality of every state
 * getMunicipalities("ZZ"); // []
 * getMunicipalities(null); // [] (only an omitted state code asks for the full list)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getMunicipalities = (stateCode?: StateCode): Municipality[] => {
	if (stateCode === undefined) {
		return getStates()
			.flatMap((state) => buildMunicipalities(state.code))
			.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
	}

	const state = getStates().find((candidate) => candidate.code === stateCode);

	if (!state) return [];

	return buildMunicipalities(state.code);
};
