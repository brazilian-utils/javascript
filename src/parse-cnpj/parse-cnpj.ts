import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeCnpj } from "../_internals/sanitize-cnpj/sanitize-cnpj";
import { type FormatCnpjOptions } from "../format-cnpj/format-cnpj";

/** Options of `parseCnpj`. */
export type ParseCnpjOptions = Pick<FormatCnpjOptions, "version">;

/**
 * Removes CNPJ formatting characters and returns a normalized value.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNPJ value to be parsed.
 * @param {ParseCnpjOptions} [options] - Optional parsing options.
 * @param {1|2} [options.version] - The CNPJ version to normalize.
 * @returns {string} The CNPJ value without formatting.
 *
 * @example
 * ```typescript
 * parseCnpj("11.222.333/0001-81"); // "11222333000181"
 * parseCnpj("12.ABC.345/01DE-35", { version: 2 }); // "12ABC34501DE35"
 * parseCnpj(-11222333000181); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const parseCnpj = (value: string | number, options?: ParseCnpjOptions): string =>
	isLookupCode(value) ? sanitizeCnpj(value, options?.version).slice(0, CNPJ_LENGTH) : "";
