import { CBO_FORMAT_REGEX, CBO_TITLES } from "../_internals/constants/cbo";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const CBO_LENGTH = 6;

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
 * A string is only read as a code when it is written in one of the documented forms: the 6
 * digits, or the `NNNN-NN` mask, with the usual separators between the groups and optional
 * surrounding whitespace. Anything else (`"2124abc05"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
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
 * getCbo("2124abc05"); // null (not a documented form)
 * getCbo(-212405); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf
 * @see Based on: https://raw.githubusercontent.com/lucaashoff/lista-cbo-json/main/cbos.json
 * Community mirror of the official table used to build `CBO_TITLES`.
 */
export const getCbo = (value: string | number): Cbo | null => {
	if (!isLookupCode(value)) return null;

	const code = typeof value === "number" ? String(value).padStart(CBO_LENGTH, "0") : value.trim();

	if (!CBO_FORMAT_REGEX.test(code)) return null;

	const digits = sanitizeToDigits(code);
	const title = CBO_TITLES[digits];

	if (title === undefined) return null;

	return { code: digits, title };
};
