import { CFOP_FORMAT_REGEX, CFOP_TABLE } from "../_internals/constants/cfop";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * A CFOP (Código Fiscal de Operações e Prestações) code.
 */
export type Cfop = {
	/** The 4 digit CFOP code. */
	code: string;
	/** The official operation description. */
	description: string;
};

/**
 * Looks a CFOP (Código Fiscal de Operações e Prestações) code up in the official table.
 *
 * The table is the consolidated Anexo II of Convênio SINIEF s/nº 1970, the text in force
 * (current wording given by Ajuste SINIEF 03/24, last amended by Ajuste SINIEF 39/25).
 *
 * Only operable codes are in the table: the group and subgroup headings of the official
 * nomenclature, the codes ending in "00" and "50" (1000, 1100, 1150, 5350, ...), are section
 * titles rather than codes a document can carry, so they give `null`.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 4
 * digits, or the `N.NNN` form the annex prints, with a single separator between the groups
 * and optional surrounding whitespace. Anything else (`"abc5102"`) is rejected instead of
 * having its digits picked out. A number is only read as a code when it is a non-negative
 * safe integer, since a sign, a decimal point or a rounded magnitude would otherwise be read
 * as a code the caller never wrote.
 *
 * @param {string|number} value - The CFOP code to look up, with or without the `N.NNN` mask,
 * e.g. `"1.101"`, `"1101"` or `1101`.
 * @returns {Cfop|null} The matching CFOP entry, or null when the code is unknown or
 * invalid.
 *
 * @example
 * ```typescript
 * getCfop("1101"); // { code: "1101", description: "Compra para industrialização ou produção rural" }
 * getCfop("1.101"); // { code: "1101", description: "Compra para industrialização ou produção rural" }
 * getCfop("0000"); // null
 * getCfop("5350"); // null (a subgroup heading, not an operable code)
 * getCfop("abc5102"); // null (not a documented form)
 * getCfop(-5102); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24
 * Anexo II of Convênio SINIEF s/nº 1970, the CFOP table in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, the consolidated text the annex belongs to.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_007_01
 * Ajuste SINIEF 07/01, the historical text that gave the CFOP its 4 digit form.
 */
export const getCfop = (value: string | number): Cfop | null => {
	if (!isLookupCode(value)) return null;

	const code = typeof value === "number" ? String(value) : value.trim();

	if (!CFOP_FORMAT_REGEX.test(code)) return null;

	const digits = sanitizeToDigits(code);
	const description = CFOP_TABLE[digits];

	if (description === undefined) return null;

	return { code: digits, description };
};
