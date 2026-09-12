import { DATA, type StateName } from "../_internals/constants/states";

/**
 * Retrieves the full name of a Brazilian state given its two-letter code (sigla).
 *
 * The match is case-insensitive and ignores leading/trailing whitespace, so `"sp"`, `"SP"`
 * and `"  Sp  "` all resolve to `"São Paulo"`.
 *
 * @param {string} code - The two-letter state code.
 * @returns {StateName|null} The full state name, or `null` when `code` does not match any
 * Brazilian state.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/estados (IBGE Localidades API)
 *
 * @example
 * ```typescript
 * getStateNameByCode("SP"); // "São Paulo"
 * getStateNameByCode("sp"); // "São Paulo"
 * getStateNameByCode("  Rj  "); // "Rio de Janeiro"
 * getStateNameByCode("ZZ"); // null
 * ```
 */
export const getStateNameByCode = (code: string): StateName | null => {
	if (typeof code !== "string") return null;

	const normalized = code.trim().toUpperCase();

	const state = DATA.find((entry) => entry.code === normalized);

	return state ? state.name : null;
};
