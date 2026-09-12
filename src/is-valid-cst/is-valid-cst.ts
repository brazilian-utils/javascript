import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { ICMS_CST_CODES, IPI_CST_CODES, PIS_COFINS_CST_CODES } from "./constants";

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
 * followed by 1 of the 11 codes `00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90`).
 *
 * `ipi` accepts 1 of the 14 codes `00, 01, 02, 03, 04, 05, 49, 50, 51, 52, 53, 54, 55, 99`.
 *
 * `pis` and `cofins` accept 1 of the 33 codes `01, 02, 03, 04, 05, 06, 07, 08, 09, 49, 50, 51,
 * 52, 53, 54, 55, 56, 60, 61, 62, 63, 64, 65, 66, 67, 70, 71, 72, 73, 74, 75, 98, 99`.
 *
 * `options.tax` is optional. When it is omitted, the code is valid as long as it exists in any
 * one of the four tables above; when it is given, only that table is consulted.
 *
 * @param {string|number} value - The CST code to be validated.
 * @param {IsValidCstOptions} [options] - The tax whose table the value is checked against.
 * Checks every table when omitted.
 * @returns {boolean} True when the code is valid for the given tax (or for any tax, when
 * `options.tax` is omitted), false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/aj007_01
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15304
 *
 * @example
 * ```typescript
 * isValidCst("110", { tax: "icms" }); // true
 * isValidCst("00", { tax: "ipi" }); // true
 * isValidCst("49", { tax: "pis" }); // true
 * isValidCst("07", { tax: "cofins" }); // true
 * isValidCst("99", { tax: "icms" }); // false
 * isValidCst("110"); // true (found in the icms table)
 * isValidCst("49"); // true (found in the ipi table)
 * isValidCst("999"); // false (not in any table)
 * ```
 */
export const isValidCst = (value: string | number, options?: IsValidCstOptions): boolean => {
	if (isNullish(value)) return false;
	if (options !== undefined && (options === null || typeof options !== "object")) return false;

	const digits = sanitizeToDigits(value);
	const tax = options?.tax;

	if (tax !== undefined) return isValidForTax(digits, tax);

	return (
		isValidForTax(digits, "icms") || isValidForTax(digits, "ipi") || isValidForTax(digits, "pis")
	);
};
