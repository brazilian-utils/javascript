import { AREA_CODE_SECONDARY_STATES, AREA_CODE_STATES } from "../_internals/constants/area-codes";
import { DATA, type State, type StateCode, type StateName } from "../_internals/constants/states";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

export type { State, StateCode, StateName } from "../_internals/constants/states";

/** The state, and the region it belongs to, that `getAreaCodeInfo` returns for a DDD. */
export type AreaCodeInfo = {
	/** The DDD (area code) as a number, e.g. `11`. */
	areaCode: number;
	/** The two-letter code of the state the DDD belongs to, e.g. `"SP"`. */
	stateCode: StateCode;
	/** The full name of the state the DDD belongs to, e.g. `"São Paulo"`. */
	stateName: StateName;
	/** The full name of the region the state belongs to, e.g. `"Sudeste"`. */
	region: State["regionName"];
	/**
	 * Every state the DDD serves, the primary `stateCode` first, e.g. `["SP"]` for 11 and
	 * `["DF", "GO"]` for 61.
	 */
	stateCodes: StateCode[];
};

/**
 * Retrieves the state (and its region) a Brazilian DDD (area code) belongs to.
 *
 * `stateCode` is always a single state: the one the DDD is seated in, the state of the city the
 * code was allocated around, which is not necessarily the state holding most of its
 * municipalities. Four DDDs straddle a state border, and for those `stateCodes` lists the
 * other states too. DDD 61 is the widest of them, serving the Distrito Federal and the twelve
 * Goiás municipalities of the Entorno do Distrito Federal, so its `stateCode` is `"DF"` and
 * its `stateCodes` is `["DF", "GO"]` even though the Distrito Federal holds only one of its
 * thirteen municipalities, Brasília. The other three are 42 (`["PR", "SC"]`, for Porto
 * União), 47 (`["SC", "PR"]`, for Rio Negro) and 49 (`["SC", "PR"]`, for Barracão), and there
 * the seat does hold every municipality but the one named.
 *
 * A `areaCode` given as a number must be a non-negative integer: a sign and a decimal point
 * are not digits, so `-11` and `1.1` are rejected instead of being read as `11`.
 *
 * @param {string|number} areaCode - The DDD to look up. Accepts a string or a non-negative
 * integer number, with any non-digit characters stripped before matching.
 * @returns {AreaCodeInfo|null} The area code info, or `null` when `areaCode` is not one of the
 * 67 DDDs in use under the Plano Geral de Numeração.
 *
 * Resolução Anatel nº 749/2022, art. 15, defines the Código Nacional (area code); the gov.br
 * page below lists the codes actually allocated and links, under "POR MUNICÍPIO", to the Anexo
 * of Resolução Anatel nº 263/2001, which gives the Código Nacional of every municipality.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais
 * @see Based on: https://informacoes.anatel.gov.br/legislacao/resolucoes/2001/383-resolucao-263
 * Anexo of Resolução nº 263/2001 (revoked; still the table Anatel's Códigos Nacionais page links to).
 * @see Based on: https://brasilapi.com.br/docs#tag/DDD
 *
 * @example
 * ```typescript
 * getAreaCodeInfo("11"); // { areaCode: 11, stateCode: "SP", stateName: "São Paulo", region: "Sudeste", stateCodes: ["SP"] }
 * getAreaCodeInfo(21); // { areaCode: 21, stateCode: "RJ", stateName: "Rio de Janeiro", region: "Sudeste", stateCodes: ["RJ"] }
 * getAreaCodeInfo("61"); // { areaCode: 61, stateCode: "DF", stateName: "Distrito Federal", region: "Centro-Oeste", stateCodes: ["DF", "GO"] }
 * getAreaCodeInfo("00"); // null
 * getAreaCodeInfo(-11); // null
 * ```
 */
export const getAreaCodeInfo = (areaCode: string | number): AreaCodeInfo | null => {
	if (!isLookupCode(areaCode)) return null;

	const digits = sanitizeToDigits(areaCode);

	const numericAreaCode = Number(digits);

	const stateCode = AREA_CODE_STATES[numericAreaCode];

	if (stateCode === undefined) return null;

	const statesByCode: Record<string, State> = {};
	for (const entry of DATA) statesByCode[entry.code] = entry;

	const state = statesByCode[stateCode];

	return {
		areaCode: numericAreaCode,
		stateCode,
		stateName: state.name,
		region: state.regionName,
		stateCodes: [stateCode, ...(AREA_CODE_SECONDARY_STATES[numericAreaCode] ?? [])],
	};
};
