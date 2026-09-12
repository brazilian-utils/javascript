import { AREA_CODE_STATES } from "../_internals/constants/area-codes";

/**
 * Retrieves every DDD (area code) that belongs to a given Brazilian state, under the Plano
 * Geral de Numeração.
 *
 * The match is case-insensitive, so `"sp"` and `"SP"` both resolve to the same list. The
 * result is sorted in ascending order and is a fresh array on every call.
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
 * getAreaCodesByState("XX"); // []
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2010/167-resolucao-553
 *   (Resolução Anatel 553/2010, Plano Geral de Numeração)
 */
export const getAreaCodesByState = (stateCode: string): number[] => {
	if (typeof stateCode !== "string") return [];

	const normalized = stateCode.trim().toUpperCase();

	if (normalized === "") return [];

	const areaCodes: number[] = [];

	for (const [areaCode, code] of Object.entries(AREA_CODE_STATES)) {
		if (code === normalized) areaCodes.push(Number(areaCode));
	}

	return areaCodes.sort((a, b) => a - b);
};
