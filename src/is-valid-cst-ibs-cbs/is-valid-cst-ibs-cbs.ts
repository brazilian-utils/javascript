import {
	CST_IBS_CBS_FORMAT_REGEX,
	CST_IBS_CBS_LENGTH,
	CST_IBS_CBS_TABLE,
} from "../_internals/constants/ibs-cbs";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";

/**
 * Validates if a CST-IBS/CBS (Código de Situação Tributária do IBS e da CBS) exists in the
 * official table, the check behind the rejection 1020 "CST do IBS/CBS informado inexistente" of
 * the NF-e.
 *
 * It is a function of its own, not a `tax` of `isValidCst`: IBS and CBS share one table, its 3
 * digit codes (`000`, `200`, `410`, ...) collide with the ICMS origin plus Tabela B form, and
 * `isValidCst` without a `tax` accepts a code of any table, so adding this one to it would change
 * what that default accepts.
 *
 * A string is only read as a code when it is written as bare digits, with optional surrounding
 * whitespace: the field has no mask, so anything else (`"cst200"`) is rejected instead of having
 * its digits picked out. A number is only read as a code when it is a non-negative safe integer.
 * A value narrower than 3 digits is left padded with zeros, as a string or as a number, since
 * the codes start with zeros a numeric field drops: `0`, `"0"` and `"000"` are all the code `000`.
 *
 * @param {string|number} value - The CST-IBS/CBS to be validated, e.g. `"200"`, `"000"` or `200`.
 * @returns {boolean} True when the code is in the CST-IBS/CBS table, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCstIbsCbs("000"); // true
 * isValidCstIbsCbs(410); // true
 * isValidCstIbsCbs(10); // true (padded to "010")
 * isValidCstIbsCbs("100"); // false
 * isValidCstIbsCbs("cst200"); // false (not a documented form)
 * isValidCstIbsCbs(-200); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/NJarYc9nus=
 * "Documentos" > "Diversos" of the Portal Nacional da NF-e, which publishes every version of the
 * "Tabela de Classificação Tributária do IBS e CBS" workbook (sheets CST and cClassTrib).
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=
 * Informe Técnico 2025.002 (v.1.60 of 22/06/2026), which divulges both tables, defines their
 * columns and states that the first three digits of a cClassTrib are its CST-IBS/CBS.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
 * Nota Técnica 2025.002-RTC (v.1.51), fields UB13 `CST` (N, 3 digits) and UB14 `cClassTrib` (N,
 * 6 digits) and the rejections 1020 (unknown CST), 1023 (unknown cClassTrib) and 1024
 * (cClassTrib incompatible with the CST).
 * @see Official: https://dfe-portal.svrs.rs.gov.br/DFE/TabelaClassificacaoTributaria
 * The same tables online, on the Portal dos Documentos Fiscais Eletrônicos (SVRS).
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
 * Lei Complementar nº 214/2025, which institutes the IBS and the CBS.
 */
export const isValidCstIbsCbs = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = padLookupCode(value, CST_IBS_CBS_LENGTH);

	return CST_IBS_CBS_FORMAT_REGEX.test(code) && code in CST_IBS_CBS_TABLE;
};
