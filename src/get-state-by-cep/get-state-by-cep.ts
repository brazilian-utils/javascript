import { DATA, type State } from "../_internals/constants/states";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { isValidCep } from "../is-valid-cep/is-valid-cep";
import { parseCep } from "../parse-cep/parse-cep";
import { CEP_RANGES } from "./constants";

export type { State } from "../_internals/constants/states";

/**
 * Retrieves the Brazilian state a CEP (postal code) belongs to, from the CEP ranges the Correios
 * assign to each state. It runs offline: the answer comes from the range table, not from a CEP
 * API, so it says which state owns the range and not whether the CEP is in use.
 *
 * The value is accepted under the same rules as `isValidCep`: 8 digits, as a string or a number,
 * with spaces, dots and hyphens ignored. A number cannot carry a leading zero, so a CEP of São
 * Paulo that starts with `0` has to be given as a string. A number must also be a non-negative
 * integer: a sign and a decimal point are not digits, so `-20040020` and `2004002.5` are rejected
 * instead of being read as a CEP.
 *
 * Amazonas, Distrito Federal and Goiás have two ranges each. No state range covers `00000-000` to
 * `00999-999` nor `78900-000` to `78999-999`, so a CEP in one of them returns `null`. Inside a
 * range the answer is the owner of the range even for a CEP no city uses, such as `10000-000`.
 *
 * @param {string|number} value - The CEP, with or without formatting.
 * @returns {State|null} The matching `State` object, or `null` when the value is not a valid CEP
 * or falls outside every range.
 *
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 * Correios "Busca Faixa de CEP": a search by UF alone answers the ranges of the state.
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Based on: https://gist.github.com/tamnil/792a6a66f6df9fc028041587cfca0c3d
 * Copy of the answers of the Correios search, the rows with an empty city are the state ranges.
 *
 * @example
 * ```typescript
 * getStateByCep("01310-100"); // { code: "SP", name: "São Paulo", regionCode: "SE", regionName: "Sudeste", ibgeCode: 35 }
 * getStateByCep(20040020); // { code: "RJ", name: "Rio de Janeiro", regionCode: "SE", regionName: "Sudeste", ibgeCode: 33 }
 * getStateByCep("69300-000")?.code; // "RR"
 * getStateByCep("72800-000")?.code; // "GO"
 * getStateByCep("00999-999"); // null
 * getStateByCep("12345"); // null
 * getStateByCep(-20040020); // null
 * ```
 */
export const getStateByCep = (value: string | number): State | null => {
	if (!isLookupCode(value) || !isValidCep(value)) return null;

	const cep = Number(parseCep(value));

	const range = CEP_RANGES.find((entry) => cep >= entry.start && cep <= entry.end);
	const state = range && DATA.find((entry) => entry.code === range.state);

	return state ? { ...state } : null;
};
