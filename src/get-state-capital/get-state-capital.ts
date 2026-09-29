import { type Municipality } from "../_internals/constants/municipalities";
import { STATE_CAPITALS } from "../_internals/constants/state-capitals";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeStateCode } from "../_internals/normalize-state-code/normalize-state-code";

export type { Municipality } from "../_internals/constants/municipalities";

/**
 * Retrieves the capital of a Brazilian state, as the same `{ code, name, stateCode }` that
 * `getMunicipalityByCode` returns for it. The match is case-insensitive and ignores leading and
 * trailing whitespace, like `getTimezoneByState`.
 *
 * The Distrito Federal is not divided into municipalities, but the IBGE codes it as a single one,
 * Brasília, and that is its capital.
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
	const normalized = normalizeStateCode(stateCode);

	if (!hasOwnKey(STATE_CAPITALS, normalized)) return null;

	const [name, code] = STATE_CAPITALS[normalized];

	return { code, name, stateCode: normalized };
};
