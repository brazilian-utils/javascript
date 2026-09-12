import { AREA_CODE_STATES } from "../_internals/constants/area-codes";
import { DATA, type State, type StateCode, type StateName } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

export type AreaCodeInfo = {
	/** The DDD (area code) as a number, e.g. `11`. */
	areaCode: number;
	/** The two-letter code of the state the DDD belongs to, e.g. `"SP"`. */
	stateCode: StateCode;
	/** The full name of the state the DDD belongs to, e.g. `"São Paulo"`. */
	stateName: StateName;
	/** The full name of the region the state belongs to, e.g. `"Sudeste"`. */
	region: State["regionName"];
};

/**
 * Retrieves the state (and its region) a Brazilian DDD (area code) belongs to.
 *
 * @param {string|number} areaCode - The DDD to look up. Accepts a string or a number, with any
 * non-digit characters stripped before matching.
 * @returns {AreaCodeInfo|null} The area code info, or `null` when `areaCode` is not one of the
 * 67 DDDs in use under the Plano Geral de Numeração.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2010/167-resolucao-553
 *   (Resolução Anatel 553/2010, Plano Geral de Numeração)
 * @see Based on: https://brasilapi.com.br/docs#tag/DDD BrasilAPI DDD endpoint, used to verify
 *   the code-to-state mapping.
 *
 * @example
 * ```typescript
 * getAreaCodeInfo("11"); // { areaCode: 11, stateCode: "SP", stateName: "São Paulo", region: "Sudeste" }
 * getAreaCodeInfo(21); // { areaCode: 21, stateCode: "RJ", stateName: "Rio de Janeiro", region: "Sudeste" }
 * getAreaCodeInfo("68"); // { areaCode: 68, stateCode: "AC", stateName: "Acre", region: "Norte" }
 * getAreaCodeInfo("00"); // null
 * ```
 */
export const getAreaCodeInfo = (areaCode: string | number): AreaCodeInfo | null => {
	if (isNullish(areaCode)) return null;

	const digits = sanitizeToDigits(areaCode);

	const numericAreaCode = Number(digits);

	if (!(numericAreaCode in AREA_CODE_STATES)) return null;

	const stateCode = AREA_CODE_STATES[numericAreaCode];

	const statesByCode: Record<string, State> = {};
	for (const entry of DATA) statesByCode[entry.code] = entry;

	const state = statesByCode[stateCode];

	return { areaCode: numericAreaCode, stateCode, stateName: state.name, region: state.regionName };
};
