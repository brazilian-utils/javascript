import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeCnpj } from "../_internals/sanitize-cnpj/sanitize-cnpj";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

/** Options of `formatCnpj`. */
export type FormatCnpjOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
	/** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`, read for truthiness like `pad`). */
	obfuscate?: boolean;
};

/**
 * Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value according to the specified options.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNPJ value to be formatted. It can be a string or a number.
 * @param {FormatCnpjOptions} [options] - Optional configuration for formatting the CNPJ.
 * @param {boolean} options.pad - If true, the value will be padded with leading zeros if necessary.
 * @param {1|2} options.version - The version of the CNPJ to be sanitized.
 * @param {boolean} options.obfuscate - If truthy, hides the first 2 digits and the 2 check
 * digits. Read for truthiness, the way `pad` is, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted CNPJ string in the pattern "00.000.000/0000-00".
 *
 * @example
 * ```typescript
 * formatCnpj("12345678000195"); // "12.345.678/0001-95"
 * formatCnpj(12345678000195); // "12.345.678/0001-95"
 * formatCnpj("12345678000195", { pad: true }); // "12.345.678/0001-95"
 * formatCnpj("12345678", { pad: true }); // "00.000.012/3456-78"
 * formatCnpj("q0SLFMBD7VX439", { version: 2 }); // "Q0.SLF.MBD/7VX4-39"
 * formatCnpj("12345678000195", { obfuscate: true }); // "**.345.678/0001-**"
 * formatCnpj(-11222333000181); // "" (not a non-negative safe integer)
 * ```
 *
 * The official character set of the alphanumeric CNPJ is the capital letters `A` to `Z` and the
 * digits in the 12 base positions, and digits only in the 2 check digits (Receita Federal, CNPJ
 * alfanumérico, and its DV manual, which reads a letter by its ASCII code). A lower case letter is
 * not part of it: under `version: 2` this function accepts one only as input normalization, the
 * way it accepts mask characters, and upper-cases the input before formatting it, so
 * `formatCnpj("q0slfmbd7vx439", { version: 2 })` returns `"Q0.SLF.MBD/7VX4-39"`.
 *
 * `obfuscate` is a convention of this library, not an official rule: no law or Receita Federal
 * act sets a masking rule for the CNPJ, whose data are public, the ANPD says "não há um padrão
 * para o mascaramento", and the Banco Central's Pix rules show the CNPJ in full where they mask
 * the CPF. It hides the first 2 characters and the 2 check digits, after the rule the Leis de
 * Diretrizes Orçamentárias set for the CPF.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf
 * Receita Federal, CNPJ alfanumérico, perguntas e respostas: the base positions take the digits 0
 * to 9 and the capital letters A to Z, the 2 check digits stay numeric.
 * @see Official: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd_uma_visao_de_processo_baseado_em_risco_e_tecnicas_computacionais.pdf
 * ANPD, Estudo Técnico sobre Anonimização de Dados na LGPD (v1.0, November 2023), "Técnica de
 * Mascaramento": "como não há um padrão para o mascaramento, é possível que partes distintas dos
 * dados estejam visíveis".
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/IV_RequisitosMinimosparaExperienciadoUsuario.pdf
 * Banco Central, Pix, Requisitos Mínimos para a Experiência do Usuário: "CPF mascarado (ex:
 * ***.777.888-**) /CNPJ", the CNPJ shown in full, and "Não deverá haver qualquer mascaramento de
 * chave Pix no retorno da consulta ao DICT".
 */
export const formatCnpj = (value: string | number, options?: FormatCnpjOptions): string => {
	if (!isLookupCode(value)) return "";

	return format({
		pad: options?.pad,
		value: sanitizeCnpj(value, options?.version),
		pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
	});
};
