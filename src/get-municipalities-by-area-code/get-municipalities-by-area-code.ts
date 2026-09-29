import { type Municipality } from "../_internals/constants/municipalities";
import { type StateCode } from "../_internals/constants/states";
import { readMunicipalities } from "../_internals/read-municipalities/read-municipalities";
import { readMunicipalityAreaCode } from "../_internals/read-municipality-area-code/read-municipality-area-code";
import { getAreaCodeInfo } from "../get-area-code-info/get-area-code-info";

export type { Municipality } from "../_internals/constants/municipalities";

let municipalitiesByAreaCode:
	| Map<number, [name: string, code: string, stateCode: StateCode][]>
	| undefined;

/**
 * Lists the Brazilian municipalities that dial a given DDD (area code, the Código Nacional of the
 * Plano Geral de Numeração).
 *
 * The DDD is read the way `getAreaCodeInfo` reads it: a string, with any non-digit characters
 * stripped, or a non-negative integer number. The municipalities come
 * state by state, the state the DDD is seated in first and then the others of
 * `AreaCodeInfo.stateCodes`, each state's sorted by name the way `getMunicipalities` sorts them.
 * Four DDDs cross a state line: 61 also covers 12 municipalities of Goiás around Brasília, 42
 * covers Porto União (SC), 47 covers Rio Negro (PR) and 49 covers Barracão (PR).
 *
 * @param {string|number} areaCode - The DDD.
 * @returns {Municipality[]} A fresh array of fresh `{ code, name, stateCode }` objects, empty
 * when `areaCode` is not one of the 67 DDDs in use.
 *
 * @example
 * ```typescript
 * getMunicipalitiesByAreaCode(68).length; // 22 (every municipality of Acre)
 * getMunicipalitiesByAreaCode("47").at(-1); // { code: "4122305", name: "Rio Negro", stateCode: "PR" }
 * getMunicipalitiesByAreaCode("(61)").length; // 13 (Brasília and 12 municipalities of Goiás)
 * getMunicipalitiesByAreaCode("20"); // []
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais
 * Anatel, Painel de Dados de Áreas Tarifárias, "Códigos Nacionais".
 * @see Official: https://www.anatel.gov.br/dadosabertos/paineis_de_dados/areastarifarias/pgcn.zip
 * `Codigos_Nacionais.csv` of 21/09/2026, the Código Nacional of every municipality in force.
 */
export const getMunicipalitiesByAreaCode = (areaCode: string | number): Municipality[] => {
	const info = getAreaCodeInfo(areaCode);

	if (info === null) return [];

	municipalitiesByAreaCode ??= new Map();

	let entries = municipalitiesByAreaCode.get(info.areaCode);

	// Stryker disable next-line ConditionalExpression: the cache only saves building the entries again; entries built on every call are the same, and the result is a copy either way.
	if (!entries) {
		entries = info.stateCodes.flatMap((stateCode) =>
			readMunicipalities(stateCode)
				.filter(([, code]) => readMunicipalityAreaCode(stateCode, code) === info.areaCode)
				.map(([name, code]): [string, string, StateCode] => [name, code, stateCode]),
		);
		// Stryker disable next-line CallExpression: the cache only saves building the entries again; not storing them means the next call builds the same entries again.
		municipalitiesByAreaCode.set(info.areaCode, entries);
	}

	return entries.map(([name, code, stateCode]) => ({ code, name, stateCode }));
};
