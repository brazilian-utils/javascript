import { type Municipality } from "../_internals/constants/municipalities";
import { MUNICIPALITY_NAMES } from "../_internals/constants/municipality-names";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { type StateCode } from "../_internals/constants/states";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeStateCode } from "../_internals/normalize-state-code/normalize-state-code";
import { readMunicipalities } from "../_internals/read-municipalities/read-municipalities";

export type { Municipality } from "../_internals/constants/municipalities";
export type { StateCode } from "../_internals/constants/states";

let sortedMunicipalities: Municipality[] | undefined;

const buildMunicipalities = (stateCode: StateCode): Municipality[] =>
	readMunicipalities(stateCode).map(([name, code]) => ({ code, name, stateCode }));

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
 * The state code is matched ignoring letter case and surrounding whitespace, like
 * `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality`:
 * `getMunicipalities("sp")` returns the 645 São Paulo municipalities, as `"SP"` does. Up to 2.4.0
 * the match was case-sensitive and `"sp"` returned `[]`.
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
 * getMunicipalities(" sp ").length; // 645 (case and surrounding whitespace are ignored)
 * getMunicipalities(null); // [] (only an omitted state code asks for the full list)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025 (data base 31/12/2025): the same 5,571 municipality
 * codes as the bundled table.
 */
export const getMunicipalities = (stateCode?: StateCode): Municipality[] => {
	if (stateCode === undefined) {
		sortedMunicipalities ??= STATE_CODES.flatMap((code) => buildMunicipalities(code)).toSorted(
			(a, b) => a.name.localeCompare(b.name, "pt-BR"),
		);

		return sortedMunicipalities.map(({ code, name, stateCode: state }) => ({
			code,
			name,
			stateCode: state,
		}));
	}

	const code = normalizeStateCode(stateCode);

	return hasOwnKey(MUNICIPALITY_NAMES, code) ? buildMunicipalities(code) : [];
};
