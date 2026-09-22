import { type Municipality } from "../_internals/constants/municipalities";
import { findCepRange } from "../_internals/find-cep-range/find-cep-range";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { CEP_RANGES } from "./constants";

export type { Municipality } from "../_internals/constants/municipalities";

/**
 * Retrieves the Brazilian municipality a CEP (postal code) belongs to, from the CEP ranges the
 * Correios assign to each municipality. It runs offline: the answer comes from the range table,
 * not from a CEP API, so it says which municipality owns the range and not whether the CEP is
 * in use.
 *
 * The value is accepted under the same rules as `isValidCep`: 8 digits, as a string or a number,
 * with spaces, dots and hyphens ignored. A number cannot carry a leading zero, so a CEP that
 * starts with `0` has to be given as a string. A number must also be a non-negative integer: a
 * sign and a decimal point are not digits, so `-1310100` and `1310100.5` are rejected instead of
 * being read as a CEP.
 *
 * A handful of municipalities the Correios range table lists share their CEP range with the
 * municipality that absorbed them, or have no dedicated range at all, so a CEP inside a state
 * range can still return `null` (or the range owner rather than every municipality of the
 * state) even for a CEP whose state `getStateByCep` resolves.
 *
 * @param {string|number} value - The CEP, with or without formatting.
 * @returns {Municipality|null} The matching `Municipality` object (the same shape
 * `getMunicipalityByCode` returns), or `null` when the value is not a valid CEP or falls outside
 * every range.
 *
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 * Correios "Busca Faixa de CEP": a search by municipality answers its CEP range.
 * @see Official: https://www.correios.com.br/acesso-a-informacao/licitacoes-e-contratos/credenciamento-ponto-de-coleta/arquivos/localidades
 * Correios "Localidades alvo (CEPs ou faixas de CEP)", used to cross-check the ranges below.
 * @see Based on: https://gist.github.com/hugosenari/ec1a7d88f5bdd01844424dbc9aff9590
 * Copy of the answers of the Correios search, one row per municipality.
 *
 * @example
 * ```typescript
 * getMunicipalityByCep("01310-100"); // { code: "3550308", name: "São Paulo", stateCode: "SP" }
 * getMunicipalityByCep(20040020); // { code: "3304557", name: "Rio de Janeiro", stateCode: "RJ" }
 * getMunicipalityByCep("00999-999"); // null
 * getMunicipalityByCep("12345"); // null
 * ```
 */
export const getMunicipalityByCep = (value: string | number): Municipality | null => {
	const range = findCepRange(value, CEP_RANGES);

	return range ? getMunicipalityByCode(range.code) : null;
};
