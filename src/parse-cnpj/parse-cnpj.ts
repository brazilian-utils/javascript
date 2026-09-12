import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { type FormatCnpjOptions } from "../format-cnpj/format-cnpj";

/** Options of `parseCnpj`. */
export type ParseCnpjOptions = Pick<FormatCnpjOptions, "version">;

const sanitize = (value: string | number, version?: FormatCnpjOptions["version"]): string => {
	if (version === 2) {
		return sanitizeToAlphanumeric(value);
	}

	return sanitizeToDigits(value);
};

/**
 * Removes CNPJ formatting characters and returns a normalized value.
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
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const parseCnpj = (value: string | number, options?: ParseCnpjOptions): string =>
	isNullish(value) ? "" : sanitize(value, options?.version).slice(0, CNPJ_LENGTH);
