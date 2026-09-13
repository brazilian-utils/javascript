import { DATA, type StateCode } from "../_internals/constants/states";
import { removeAccents } from "../remove-accents/remove-accents";

export type { StateCode } from "../_internals/constants/states";

const normalizeName = (value: string): string =>
	removeAccents(value).replaceAll(/\s+/g, " ").trim().toLowerCase();

/**
 * Retrieves the two-letter code (sigla) of a Brazilian state given its full name.
 *
 * The match is accent-insensitive, case-insensitive and ignores leading/trailing whitespace,
 * so `"  são paulo  "`, `"Sao Paulo"` and `"SÃO PAULO"` all resolve to `"SP"`. Every run of
 * internal whitespace collapses into a single space too, so `"Rio  de  Janeiro"` resolves to
 * `"RJ"`, while a name written without the space matches nothing: only the runs that are there
 * collapse, so `"saopaulo"` is not `"São Paulo"`. The casing is folded to lower case, the
 * direction that leaves `"ß"` alone instead of expanding it into `"SS"`, so `"Mato Großo"` is
 * not `"Mato Grosso"` either.
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
 * getStateCodeByName("Rio  de  Janeiro"); // "RJ"
 * getStateCodeByName("Neverland"); // null
 * ```
 */
export const getStateCodeByName = (name: string): StateCode | null => {
	const normalized = normalizeName(name);

	const state = DATA.find((entry) => normalizeName(entry.name) === normalized);

	return state ? state.code : null;
};
