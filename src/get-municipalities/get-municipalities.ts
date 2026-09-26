import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/municipalities";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { type StateCode } from "../_internals/constants/states";

export type { Municipality } from "../_internals/constants/municipalities";
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
 * The state code is matched exactly, case included: `getMunicipalities("sp")` returns `[]` where
 * `getMunicipalities("SP")` returns the 645 São Paulo municipalities. `getMunicipalities` and
 * `getCities` are the only state-taking lookups that are case-sensitive; `getStateNameByCode`,
 * `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality` all fold case.
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
 * getMunicipalities("sp"); // [] (the state code is case-sensitive here)
 * getMunicipalities(null); // [] (only an omitted state code asks for the full list)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getMunicipalities = (stateCode?: StateCode): Municipality[] => {
	if (stateCode === undefined) {
		return STATE_CODES.flatMap((code) => buildMunicipalities(code)).sort((a, b) =>
			a.name.localeCompare(b.name, "pt-BR"),
		);
	}

	if (typeof stateCode !== "string" || !Object.hasOwn(CITIES_DATA, stateCode)) return [];

	return buildMunicipalities(stateCode);
};
