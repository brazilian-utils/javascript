import { DATA, type State } from "../_internals/constants/states";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Retrieves the Brazilian state whose 2-digit IBGE code ("cUF", the Código da Unidade da
 * Federação) matches the given value.
 *
 * The IBGE code is the same 2-digit UF code found in the first field of every DF-e access key
 * (chave de acesso) issued for NF-e, NFC-e, CT-e and MDF-e documents.
 *
 * A `code` given as a number must be a non-negative integer: a sign and a decimal point are
 * not digits, so `-35` and `3.5` are rejected instead of being read as `35`.
 *
 * @param {string|number} code - The 2-digit IBGE UF code. Accepts a string or a non-negative
 * integer number, with any non-digit characters stripped before matching.
 * @returns {State|null} The matching `State` object, or `null` when `code` is not a known
 * IBGE UF code.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/estados (IBGE Localidades API, field `id`)
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 *   (Manual de Orientação do Contribuinte, "chave de acesso" / "Tabela do IBGE")
 *
 * @example
 * ```typescript
 * getStateByIbgeCode("35"); // { code: "SP", name: "São Paulo", regionCode: "SE", regionName: "Sudeste", ibgeCode: 35 }
 * getStateByIbgeCode(35); // { code: "SP", name: "São Paulo", regionCode: "SE", regionName: "Sudeste", ibgeCode: 35 }
 * getStateByIbgeCode("11"); // { code: "RO", name: "Rondônia", regionCode: "N", regionName: "Norte", ibgeCode: 11 }
 * getStateByIbgeCode("00"); // null
 * getStateByIbgeCode(""); // null
 * getStateByIbgeCode(-35); // null
 * ```
 */
export const getStateByIbgeCode = (code: string | number): State | null => {
	if (!isLookupCode(code)) return null;

	const digits = sanitizeToDigits(code);

	const numericCode = Number(digits);

	const state = DATA.find((entry) => entry.ibgeCode === numericCode);

	return state ? { ...state } : null;
};
