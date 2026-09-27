import { DATA, type State } from "../_internals/constants/states";
import { copyState } from "../_internals/copy-state/copy-state";

export type { State } from "../_internals/constants/states";

/**
 * Retrieves the Brazilian states of a region (Grande Região), given the region code the IBGE
 * abbreviates it with: `"N"`, `"NE"`, `"SE"`, `"S"` or `"CO"`, the same `State["regionCode"]`
 * every state carries. The match is case-insensitive and ignores leading and trailing whitespace.
 * The states come sorted by name, the way `getStates` sorts them.
 *
 * Each call returns a fresh array of fresh objects, so mutating the result never affects the
 * underlying data or later calls.
 *
 * @param {string} regionCode - The region code.
 * @returns {State[]} The states of the region, or an empty array when `regionCode` does not match
 * any region.
 *
 * @example
 * ```typescript
 * getStatesByRegion("S").map((state) => state.code); // ["PR", "RS", "SC"]
 * getStatesByRegion("co").map((state) => state.code); // ["DF", "GO", "MT", "MS"]
 * getStatesByRegion("X"); // []
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/estados
 * IBGE, API de Localidades, `estados`: the `regiao` of each state.
 */
export const getStatesByRegion = (regionCode: string): State[] => {
	if (typeof regionCode !== "string") return [];

	const normalized = regionCode.trim().toUpperCase();

	return DATA.filter((state) => state.regionCode === normalized).map((state) => copyState(state));
};
