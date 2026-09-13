import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CST_FORMAT_REGEX, ICMS_CST_CODES, IPI_CST_CODES, PIS_COFINS_CST_CODES } from "./constants";

/**
 * Options for `isValidCst`.
 */
export type IsValidCstOptions = {
	/**
	 * The tax whose CST (Código de Situação Tributária) table the value is checked against.
	 * Omit it to accept a code that exists in any of the four tables (`icms`, `ipi`, `pis`,
	 * `cofins`).
	 */
	tax?: "icms" | "ipi" | "pis" | "cofins";
};

const isValidIcmsCst = (digits: string): boolean =>
	digits.charAt(0) <= "8" && (ICMS_CST_CODES as readonly string[]).includes(digits.slice(1));

const isValidForTax = (digits: string, tax: "icms" | "ipi" | "pis" | "cofins"): boolean => {
	if (tax === "icms") return isValidIcmsCst(digits);
	if (tax === "ipi") return (IPI_CST_CODES as readonly string[]).includes(digits);

	if (tax === "pis" || tax === "cofins") {
		return (PIS_COFINS_CST_CODES as readonly string[]).includes(digits);
	}

	return false;
};

/**
 * Validates if a CST (Código de Situação Tributária) code is valid for a given tax.
 *
 * `icms` accepts the 3 digit form used on tax documents (1 origin digit from `0` to `8`
 * followed by 1 of the 15 codes `00, 02, 10, 15, 20, 30, 40, 41, 50, 51, 53, 60, 61, 70, 90`
 * of the Tabela B in force, the one Ajuste SINIEF 39/23 gave and Ajuste SINIEF 20/24 amended;
 * `02`, `15`, `53` and `61` are the monofasia de combustíveis codes it added).
 *
 * `ipi` accepts 1 of the 14 codes `00, 01, 02, 03, 04, 05, 49, 50, 51, 52, 53, 54, 55, 99`.
 *
 * `pis` and `cofins` accept 1 of the 33 codes `01, 02, 03, 04, 05, 06, 07, 08, 09, 49, 50, 51,
 * 52, 53, 54, 55, 56, 60, 61, 62, 63, 64, 65, 66, 67, 70, 71, 72, 73, 74, 75, 98, 99`.
 *
 * `options.tax` is optional. When it is omitted, the code is valid as long as it exists in any
 * one of the four tables above; when it is given, only that table is consulted.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 2
 * digits of a Tabela B code, or the 3 digits of the ICMS form with an optional single
 * separator after the origin digit, plus optional surrounding whitespace. The origin digit is
 * the only boundary a printed CST has, so `"0 10"` and `"1-10"` are read while `"0-0"`,
 * `"11-0"` and `"00-"` are not. Anything else (`"abc110"`) is rejected instead of having its
 * digits picked out. A number is
 * only read as a code when it is a non-negative safe integer, since a sign, a decimal point or
 * a rounded magnitude would otherwise be read as a code the caller never wrote.
 *
 * @param {string|number} value - The CST code to be validated, e.g. `"110"`, `"0 10"` or `110`.
 * @param {IsValidCstOptions} [options] - The tax whose table the value is checked against.
 * Checks every table when omitted.
 * @returns {boolean} True when the code is valid for the given tax (or for any tax, when
 * `options.tax` is omitted), false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, whose Anexo I carries the CST tables in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2023/ajuste-sinief-39-23
 * Ajuste SINIEF 39/23, which gave Tabela B its current wording with effect from 01.12.23.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24
 * Ajuste SINIEF 20/24, which struck items 12, 13, 52, 72 and 74 from Tabela B (effects from
 * 09.07.24) before they ever took effect: those items sat in the inciso III of its cláusula
 * segunda, whose effect the alínea "b" of the inciso I of the cláusula terceira of Ajuste SINIEF
 * 39/23 had deferred to 1º de outubro de 2024, so the revocation reached them first and the codes
 * were never in force. Neither ajuste uses the phrase "sem efeitos"; this is the reading of the
 * two clauses, not a quotation.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/1994/aj_003_94
 * Ajuste SINIEF 03/1994, which instituted the ICMS CST as the two digit code AB.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2000/AJ_006_00
 * Ajuste SINIEF 06/2000, the historical Tabela B superseded by Ajuste SINIEF 39/23.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2012/aj_020_12
 * Ajuste SINIEF 20/2012, which gives Tabela A (origem da mercadoria, 0 to 7).
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2013/aj_015_13
 * Ajuste SINIEF 15/2013, which added origem 8 to Tabela A.
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974
 * Instrução Normativa RFB nº 1.009/2010, Tabelas I to III (CST-IPI, CST-PIS and CST-COFINS).
 *
 * @example
 * ```typescript
 * isValidCst("110", { tax: "icms" }); // true
 * isValidCst("002", { tax: "icms" }); // true (monofasia de combustíveis)
 * isValidCst("00", { tax: "ipi" }); // true
 * isValidCst("49", { tax: "pis" }); // true
 * isValidCst("07", { tax: "cofins" }); // true
 * isValidCst("99", { tax: "icms" }); // false
 * isValidCst("110"); // true (found in the icms table)
 * isValidCst("49"); // true (found in the ipi table)
 * isValidCst("999"); // false (not in any table)
 * isValidCst("abc110"); // false (not a documented form)
 * isValidCst(-110); // false (not a non-negative safe integer)
 * ```
 */
export const isValidCst = (value: string | number, options?: IsValidCstOptions): boolean => {
	if (!isLookupCode(value)) return false;
	if (options !== undefined && (options === null || typeof options !== "object")) return false;

	const code = typeof value === "number" ? String(value) : value.trim();

	if (!CST_FORMAT_REGEX.test(code)) return false;

	const digits = sanitizeToDigits(code);
	const tax = options?.tax;

	if (tax !== undefined) return isValidForTax(digits, tax);

	return (
		isValidForTax(digits, "icms") || isValidForTax(digits, "ipi") || isValidForTax(digits, "pis")
	);
};
