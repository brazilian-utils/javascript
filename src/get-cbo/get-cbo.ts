import { CBO_TITLES } from "../_internals/constants/cbo";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * A CBO (Classificação Brasileira de Ocupações) occupation.
 */
export type Cbo = {
	/** The 6 digit occupation code, without the hyphen mask. */
	code: string;
	/** The official occupation title. */
	title: string;
};

/**
 * Looks a CBO (Classificação Brasileira de Ocupações) code up in the official CBO 2002
 * table.
 *
 * @param {string|number} value - The CBO code to look up, with or without the hyphen
 * mask, e.g. `"2124-05"`, `"212405"` or `212405`.
 * @returns {Cbo|null} The matching occupation, or null when the code is unknown or invalid.
 *
 * @example
 * ```typescript
 * getCbo("2124-05"); // { code: "212405", title: "Analista de desenvolvimento de sistemas" }
 * getCbo(10205); // { code: "010205", title: "Oficial da Aeronáutica" } (a number is padded to 6 digits)
 * getCbo("999999"); // null
 * ```
 *
 * @see Official: http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf
 * @see Based on: https://raw.githubusercontent.com/lucaashoff/lista-cbo-json/main/cbos.json
 * Community mirror of the official table used to build `CBO_TITLES`.
 */
export const getCbo = (value: string | number): Cbo | null => {
	if (isNullish(value) || value === "") return null;

	const digits =
		typeof value === "number" ? String(value).padStart(6, "0") : sanitizeToDigits(value);

	if (digits.length !== 6 || !(digits in CBO_TITLES)) return null;

	return { code: digits, title: CBO_TITLES[digits] };
};
