import { readMunicipalityAreaCode } from "../_internals/read-municipality-area-code/read-municipality-area-code";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";

/**
 * Looks up the DDD (area code, the Código Nacional of the Plano Geral de Numeração) in force for
 * a Brazilian municipality, given its 7 digit IBGE code.
 *
 * The code is read the way `getMunicipalityByCode` reads it: a string of digits that may carry
 * whitespace and hyphens, or a non-negative integer number. Every one of the 5,571 municipalities
 * has exactly one DDD, so `null` only means the code is not a municipality.
 *
 * A DDD mostly follows state lines, with four exceptions: 61, the DDD of Brasília, also covers
 * 12 municipalities of Goiás around it, and three municipalities dial the DDD of the
 * neighboring state, Rio Negro (PR) 47, Barracão (PR) 49 and Porto União (SC) 42.
 * `getAreaCodeInfo` gives the state and region the DDD is seated in.
 *
 * @param {string|number} code - The 7 digit IBGE municipality code.
 * @returns {number|null} The DDD, or `null` when `code` is not the code of a municipality.
 *
 * @example
 * ```typescript
 * getAreaCodeByMunicipalityCode("3550308"); // 11 (São Paulo/SP)
 * getAreaCodeByMunicipalityCode(3304557); // 21 (Rio de Janeiro/RJ)
 * getAreaCodeByMunicipalityCode("4122305"); // 47 (Rio Negro/PR)
 * getAreaCodeByMunicipalityCode("0000000"); // null
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais
 * Anatel, Painel de Dados de Áreas Tarifárias, "Códigos Nacionais".
 * @see Official: https://www.anatel.gov.br/dadosabertos/paineis_de_dados/areastarifarias/pgcn.zip
 * `Codigos_Nacionais.csv` of 21/09/2026, the Código Nacional of every municipality in force.
 */
export const getAreaCodeByMunicipalityCode = (code: string | number): number | null => {
	const municipality = getMunicipalityByCode(code);

	if (municipality === null) return null;

	return readMunicipalityAreaCode(municipality.stateCode, municipality.code);
};
