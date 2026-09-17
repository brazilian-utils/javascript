import { CBO_FORMAT_REGEX, CBO_TITLES } from "../_internals/constants/cbo";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const CBO_LENGTH = 6;

/**
 * A CBO (Classificação Brasileira de Ocupações) occupation.
 */
export type Cbo = {
	/** The 6 digit occupation code, without the hyphen mask. */
	code: string;
	/** The official occupation description, the title the MTE table prints. */
	description: string;
};

/**
 * Looks a CBO (Classificação Brasileira de Ocupações) code up in the official CBO 2002
 * table.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 6
 * digits, or the `NNNN-NN` mask, with a single separator between the groups and optional
 * surrounding whitespace. Anything else (`"2124abc05"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
 *
 * A CBO code is always 6 digits and its leading zeros are part of it, so a value written as
 * bare digits is left padded with zeros to 6 whether it comes as a string or as a number:
 * `10205`, `"10205"` and `"010205"` are the same code. A masked value already carries its
 * separators and is read as written.
 *
 * @param {string|number} value - The CBO code to look up, with or without the hyphen
 * mask, e.g. `"2124-05"`, `"212405"` or `212405`.
 * @returns {Cbo|null} The matching occupation, or null when the code is unknown or invalid.
 *
 * @example
 * ```typescript
 * getCbo("2124-05"); // { code: "212405", description: "Analista de desenvolvimento de sistemas" }
 * getCbo(10205); // { code: "010205", description: "Oficial da aeronáutica" } (padded to 6 digits)
 * getCbo("10205"); // { code: "010205", description: "Oficial da aeronáutica" } (padded to 6 digits)
 * getCbo("999999"); // null
 * getCbo("2124abc05"); // null (not a documented form)
 * getCbo(-212405); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv
 * The CBO 2002 occupation table, as published by the Ministério do Trabalho e Emprego.
 * @see Based on: https://raw.githubusercontent.com/lucaashoff/lista-cbo-json/main/cbos.json
 * Community mirror of the same table, the fallback `CBO_TITLES` was built from before the
 * official CSV was used.
 */
export const getCbo = (value: string | number): Cbo | null => {
	if (!isLookupCode(value)) return null;

	const code = padLookupCode(value, CBO_LENGTH);

	if (!CBO_FORMAT_REGEX.test(code)) return null;

	const digits = sanitizeToDigits(code);
	const description = CBO_TITLES[digits];

	if (description === undefined) return null;

	return { code: digits, description };
};
