import { CST_IBS_CBS_LENGTH, CST_IBS_CBS_TABLE } from "../_internals/constants/ibs-cbs";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { isValidCstIbsCbs } from "../is-valid-cst-ibs-cbs/is-valid-cst-ibs-cbs";

/**
 * A CST-IBS/CBS (Código de Situação Tributária do IBS e da CBS) code.
 */
export type CstIbsCbs = {
	/** The 3 digit CST-IBS/CBS code. */
	code: string;
	/** The description the official CST table gives the code. */
	description: string;
};

/**
 * Looks a CST-IBS/CBS (Código de Situação Tributária do IBS e da CBS) up in the official table,
 * the code the field `CST` of the group `IBSCBS` carries in the NF-e, NFC-e, CT-e, NFS-e and the
 * other electronic fiscal documents of the tax reform (Lei Complementar nº 214/2025).
 *
 * It is a table of its own, not one more tax of `isValidCst`: IBS and CBS share it, and its 3
 * digit codes (`000`, `200`, `410`, ...) would be misread as the ICMS origin plus Tabela B form.
 *
 * A string is only read as a code when it is written as bare digits, with optional surrounding
 * whitespace: the field has no mask, so anything else (`"cst200"`) is rejected instead of having
 * its digits picked out. A number is only read as a code when it is a non-negative safe integer.
 * A value narrower than 3 digits is left padded with zeros, as a string or as a number, since
 * the codes start with zeros a numeric field drops: `0`, `"0"` and `"000"` are all the code `000`.
 *
 * @param {string|number} value - The CST-IBS/CBS to look up, e.g. `"200"`, `"000"` or `200`.
 * @returns {CstIbsCbs|null} The matching entry, or null exactly when `isValidCstIbsCbs` rejects
 * the value.
 *
 * @example
 * ```typescript
 * getCstIbsCbs("000"); // { code: "000", description: "Tributação integral" }
 * getCstIbsCbs(410); // { code: "410", description: "Imunidade e não incidência" }
 * getCstIbsCbs(10); // { code: "010", description: "Tributação com alíquotas uniformes" }
 * getCstIbsCbs("100"); // null
 * getCstIbsCbs("cst200"); // null (not a documented form)
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
export const getCstIbsCbs = (value: string | number): CstIbsCbs | null => {
	if (!isValidCstIbsCbs(value)) return null;

	const code = padLookupCode(value, CST_IBS_CBS_LENGTH);

	return { code, description: CST_IBS_CBS_TABLE[code] };
};
