import { type Municipality } from "../_internals/constants/municipalities";
import { DATA } from "../_internals/constants/states";

export type { Municipality } from "../_internals/constants/municipalities";

/**
 * Retrieves the capital of a Brazilian state, as the same `{ code, name, stateCode }` that
 * `getMunicipalityByCode` returns for it: the `capital` of the state `getStates` returns, with the
 * state code added. The match is case-insensitive and ignores leading and
 * trailing whitespace, like `getTimezoneByState`.
 *
 * For the Distrito Federal, which has no municipalities, the capital is Brasília, with the code
 * the IBGE gives the whole district.
 *
 * @param {string} stateCode - The two-letter state code (sigla).
 * @returns {Municipality|null} A fresh object with the capital's 7 digit IBGE code, its name and
 * its state, or `null` when `stateCode` does not match any Brazilian state.
 *
 * @example
 * ```typescript
 * getStateCapital("SP"); // { code: "3550308", name: "São Paulo", stateCode: "SP" }
 * getStateCapital("to"); // { code: "1721000", name: "Palmas", stateCode: "TO" }
 * getStateCapital("DF"); // { code: "5300108", name: "Brasília", stateCode: "DF" }
 * getStateCapital("ZZ"); // null
 * ```
 *
 * @see Official: https://anuario.ibge.gov.br/2024/territorio/posicao-e-extensao.html
 * IBGE, Anuário Estatístico do Brasil, Tabela 1.1.1.2, "Localização geográfica, altitude e
 * distância a Brasília, segundo os Municípios das Capitais - 2025".
 */
export const getStateCapital = (stateCode: string): Municipality | null => {
	if (typeof stateCode !== "string") return null;

	const normalized = stateCode.trim().toUpperCase();

	const state = DATA.find((entry) => entry.code === normalized);

	return state
		? { code: state.capital.code, name: state.capital.name, stateCode: state.code }
		: null;
};
