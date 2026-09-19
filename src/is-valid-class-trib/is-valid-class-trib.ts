import {
	CLASS_TRIB_CODES,
	CLASS_TRIB_FORMAT_REGEX,
	CLASS_TRIB_LENGTH,
	CST_IBS_CBS_LENGTH,
} from "../_internals/constants/ibs-cbs";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";

/**
 * Options for `isValidClassTrib`.
 */
export type IsValidClassTribOptions = {
	/**
	 * The CST-IBS/CBS the document carries next to the cClassTrib. When given, the classification
	 * also has to belong to it (its first 3 digits); omit it to check the cClassTrib alone.
	 */
	cst?: string | number;
};

/**
 * Validates if a cClassTrib (Código de Classificação Tributária do IBS e da CBS) exists in the
 * official table, the check behind the rejection 1023 "Classificação Tributária do IBS/CBS
 * informada inexistente" of the NF-e.
 *
 * A document carries the cClassTrib next to a CST-IBS/CBS and the pair has to match: every
 * classification belongs to one CST, the first 3 digits of its code. Pass that CST as
 * `options.cst` to check the pair too, the rejection 1024 "Classificação Tributária do IBS e da
 * CBS incompatível com o CST informado". A `cst` that is given and is not the CST of the
 * classification, whatever it is, makes the result false.
 *
 * Only the classifications in force count: one the Informe Técnico excluded by closing its
 * validity (220001, 220002 and 220003 in v.1.60) is rejected. Only the code list is bundled with
 * this function, not the descriptions `getClassTrib` returns.
 *
 * A string is only read as a code when it is written as bare digits, with optional surrounding
 * whitespace: the field has no mask, so anything else (`"c200001"`) is rejected instead of
 * having its digits picked out. A number is only read as a code when it is a non-negative safe
 * integer. A value narrower than 6 digits is left padded with zeros, as a string or as a number,
 * since the codes start with zeros a numeric field drops: `1`, `"1"` and `"000001"` are all the
 * code `000001`. `options.cst` is read the same way, padded to 3 digits.
 *
 * @param {string|number} value - The cClassTrib to be validated, e.g. `"200001"` or `200001`.
 * @param {IsValidClassTribOptions} [options] - The CST-IBS/CBS the code has to belong to.
 * @returns {boolean} True when the code is in the cClassTrib table and, when `options.cst` is
 * given, belongs to that CST; false otherwise.
 *
 * @example
 * ```typescript
 * isValidClassTrib("200001"); // true
 * isValidClassTrib(1); // true (padded to "000001")
 * isValidClassTrib("200001", { cst: "200" }); // true
 * isValidClassTrib("200001", { cst: "000" }); // false (the classification belongs to CST 200)
 * isValidClassTrib("999999"); // false
 * isValidClassTrib("220001"); // false (excluded by Informe Técnico 2025.002 v.1.60)
 * isValidClassTrib("c200001"); // false (not a documented form)
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
export const isValidClassTrib = (
	value: string | number,
	options?: IsValidClassTribOptions,
): boolean => {
	if (!isLookupCode(value)) return false;
	if (options !== undefined && (options === null || typeof options !== "object")) return false;

	const code = padLookupCode(value, CLASS_TRIB_LENGTH);

	if (!CLASS_TRIB_FORMAT_REGEX.test(code) || !CLASS_TRIB_CODES.includes(code)) return false;

	const cst = options?.cst;

	if (cst === undefined) return true;
	if (!isLookupCode(cst)) return false;

	return code.slice(0, CST_IBS_CBS_LENGTH) === padLookupCode(cst, CST_IBS_CBS_LENGTH);
};
