import { CLASS_TRIB_TABLE } from "../_internals/constants/class-trib";
import {
	CLASS_TRIB_FORMAT_REGEX,
	CLASS_TRIB_LENGTH,
	CST_IBS_CBS_LENGTH,
} from "../_internals/constants/ibs-cbs";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";

/**
 * A cClassTrib (Código de Classificação Tributária do IBS e da CBS) code.
 */
export type ClassTrib = {
	/** The 6 digit cClassTrib code. */
	code: string;
	/** The 3 digit CST-IBS/CBS the classification belongs to, the first 3 digits of the code. */
	cst: string;
	/** The short name the official table gives for display ("Nome cClassTrib"). */
	name: string;
	/** The situation the classification refers to ("Descrição cClassTrib"). */
	description: string;
};

/**
 * Looks a cClassTrib (Código de Classificação Tributária do IBS e da CBS) up in the official
 * table, the code the field `cClassTrib` of the group `IBSCBS` carries next to the CST-IBS/CBS
 * in the electronic fiscal documents of the tax reform (Lei Complementar nº 214/2025).
 *
 * Every classification belongs to exactly one CST-IBS/CBS, the first 3 digits of its code, so
 * the entry carries it as `cst` and the lookup needs no CST to narrow it. The table holds the
 * classifications in force: one the Informe Técnico excluded by closing its validity (220001,
 * 220002 and 220003 in v.1.60) gives `null`. The legal wording the workbook also prints for
 * each row (the article of the law and of both regulations) is not shipped.
 *
 * A string is only read as a code when it is written as bare digits, with optional surrounding
 * whitespace: the field has no mask, so anything else (`"c200001"`) is rejected instead of
 * having its digits picked out. A number is only read as a code when it is a non-negative safe
 * integer. A value narrower than 6 digits is left padded with zeros, as a string or as a number,
 * since the codes start with zeros a numeric field drops: `1`, `"1"` and `"000001"` are all the
 * code `000001`.
 *
 * It reads the table itself rather than starting with `isValidClassTrib`, the rule the other
 * getters follow: `isValidClassTrib` checks the codes-only list precisely so that it does not
 * bundle the descriptions, and calling it here would put that list in this bundle on top of the
 * table, which already answers the same question.
 *
 * @param {string|number} value - The cClassTrib to look up, e.g. `"200001"` or `200001`.
 * @returns {ClassTrib|null} The matching entry, or null exactly when `isValidClassTrib` (called
 * without `cst`) returns false.
 *
 * @example
 * ```typescript
 * getClassTrib("000002");
 * // {
 * //   code: "000002",
 * //   cst: "000",
 * //   name: "Exploração de via",
 * //   description: "Exploração de via, observado o art. 11 da Lei Complementar nº 214, de 2025.",
 * // }
 * getClassTrib(2)?.code; // "000002"
 * getClassTrib("999999"); // null
 * getClassTrib("220001"); // null (excluded by Informe Técnico 2025.002 v.1.60)
 * getClassTrib("c200001"); // null (not a documented form)
 * ```
 *
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/NJarYc9nus=
 * "Documentos" > "Diversos" of the Portal Nacional da NF-e, which publishes every version of the
 * "Tabela de Classificação Tributária do IBS e CBS" workbook (sheets CST and cClassTrib).
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=
 * Informe Técnico 2025.002 (v.1.60 of 23/06/2026), which divulges both tables, defines their
 * columns and states that the first three digits of a cClassTrib are its CST-IBS/CBS.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
 * Nota Técnica 2025.002-RTC (v.1.51), fields UB13 `CST` (N, 3 digits) and UB14 `cClassTrib` (N,
 * 6 digits) and the rejections 1020 (unknown CST), 1023 (unknown cClassTrib) and 1024
 * (cClassTrib incompatible with the CST).
 * @see Official: https://dfe-portal.svrs.rs.gov.br/DFE/ClassificacaoTributaria
 * The same tables online, on the Portal dos Documentos Fiscais Eletrônicos (SVRS).
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
 * Lei Complementar nº 214/2025, which institutes the IBS and the CBS.
 */
export const getClassTrib = (value: string | number): ClassTrib | null => {
	if (!isLookupCode(value)) return null;

	const code = padLookupCode(value, CLASS_TRIB_LENGTH);

	if (!CLASS_TRIB_FORMAT_REGEX.test(code)) return null;

	const entry = CLASS_TRIB_TABLE[code];

	if (entry === undefined) return null;

	const [name, description] = entry;

	return { code, cst: code.slice(0, CST_IBS_CBS_LENGTH), name, description };
};
