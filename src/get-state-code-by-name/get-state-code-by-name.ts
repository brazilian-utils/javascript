import { DATA, type StateCode } from "../_internals/constants/states";
import { removeAccents } from "../remove-accents/remove-accents";

/**
 * Retrieves the two-letter code (sigla) of a Brazilian state given its full name.
 *
 * The match is accent-insensitive, case-insensitive and ignores leading/trailing whitespace,
 * so `"  são paulo  "`, `"Sao Paulo"` and `"SÃO PAULO"` all resolve to `"SP"`.
 *
 * @param {string} name - The full name of the state.
 * @returns {StateCode|null} The two-letter state code, or `null` when `name` does not match
 * any Brazilian state.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/estados (IBGE Localidades API)
 *
 * @example
 * ```typescript
 * getStateCodeByName("São Paulo"); // "SP"
 * getStateCodeByName("sao paulo"); // "SP"
 * getStateCodeByName("  Rio de Janeiro  "); // "RJ"
 * getStateCodeByName("Neverland"); // null
 * ```
 */
export const getStateCodeByName = (name: string): StateCode | null => {
	const normalized = removeAccents(name).trim().toLowerCase();

	const state = DATA.find((entry) => removeAccents(entry.name).toLowerCase() === normalized);

	return state ? state.code : null;
};
