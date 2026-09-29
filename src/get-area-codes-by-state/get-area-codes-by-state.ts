import { AREA_CODE_SECONDARY_STATES, AREA_CODE_STATES } from "../_internals/constants/area-codes";
import { normalizeStateCode } from "../_internals/read-state-code/read-state-code";

/**
 * Retrieves every DDD (area code) that serves a given Brazilian state, under the Plano Geral
 * de Numeração.
 *
 * The match is case-insensitive, so `"sp"` and `"SP"` both resolve to the same list. The
 * result is sorted in ascending order and is a fresh array on every call.
 *
 * A DDD that straddles a state border is listed under every state it serves, so DDD 61 comes
 * back for both `"DF"` and `"GO"`: it serves the Distrito Federal and the twelve Goiás
 * municipalities of the Entorno do Distrito Federal. The other three are 42, shared by Paraná
 * and Porto União (SC), 47, shared by Santa Catarina and Rio Negro (PR), and 49, shared by
 * Santa Catarina and Barracão (PR).
 *
 * Resolução Anatel nº 749/2022, art. 15, defines the Código Nacional (area code). The Anexo the
 * gov.br page below links to, giving the Código Nacional of every municipality, is the one this
 * inverse lookup was derived from and is no longer in force; the current Anatel table
 * (`Codigos_Nacionais.csv` of the Painel de Áreas Tarifárias, 21/09/2026) gives the same result
 * for every state.
 *
 * @param {string} stateCode - The two-letter code (sigla) of the state.
 * @returns {number[]} The DDDs of the state, sorted ascending, or an empty array when
 * `stateCode` does not match any Brazilian state.
 *
 * @example
 * ```typescript
 * getAreaCodesByState("SP"); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
 * getAreaCodesByState("sp"); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
 * getAreaCodesByState("AC"); // [68]
 * getAreaCodesByState("DF"); // [61]
 * getAreaCodesByState("GO"); // [61, 62, 64]
 * getAreaCodesByState("XX"); // []
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais
 * @see Official: https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais
 * Anatel, Painel de Dados de Áreas Tarifárias, "Códigos Nacionais", the page the Anatel FAQ
 * points to for the CN of every municipality ("67 (sessenta e sete) áreas de numeração").
 * @see Official: https://www.anatel.gov.br/dadosabertos/paineis_de_dados/areastarifarias/pgcn.zip
 * `Codigos_Nacionais.csv` of 21/09/2026, the CN of all 5,571 municipalities in force.
 * @see Based on: https://informacoes.anatel.gov.br/legislacao/resolucoes/2001/383-resolucao-263
 * Anexo of Resolução nº 263/2001, revoked, and still the table Anatel's page links to.
 */
export const getAreaCodesByState = (stateCode: string): number[] => {
	const normalized = normalizeStateCode(stateCode);

	const areaCodes: number[] = [];

	for (const [areaCode, code] of Object.entries(AREA_CODE_STATES)) {
		const secondaryStates = AREA_CODE_SECONDARY_STATES[Number(areaCode)];
		const states = secondaryStates === undefined ? [code] : [code, ...secondaryStates];

		if (states.some((state) => state === normalized)) {
			areaCodes.push(Number(areaCode));
		}
	}

	return areaCodes;
};
