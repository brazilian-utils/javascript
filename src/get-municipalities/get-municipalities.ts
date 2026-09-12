import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";
import { getStates } from "../get-states/get-states";

const buildMunicipalities = (stateCode: StateCode): Municipality[] =>
	CITIES_DATA[stateCode].map(([name, code]) => ({ code, name, stateCode }));

/**
 * Returns Brazilian municipalities published by the IBGE, optionally filtered by state.
 *
 * If `stateCode` is provided, only municipalities of that state are returned. If it is
 * omitted, every municipality of every state is returned, sorted with `localeCompare` in the
 * "pt-BR" locale so accented names land where a Brazilian reader expects them.
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
