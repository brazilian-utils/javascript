import { CFOP_FORMAT_REGEX, CFOP_TABLE } from "../_internals/constants/cfop";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates if a CFOP (Código Fiscal de Operações e Prestações) code exists in the
 * official table.
 *
 * The table is the consolidated Anexo II of Convênio SINIEF s/nº 1970, the text in force
 * (current wording given by Ajuste SINIEF 03/24, last amended by Ajuste SINIEF 39/25).
 *
 * Only operable codes count: the group and subgroup headings of the official nomenclature,
 * the codes ending in "00" and "50" (1000, 1100, 1150, 5350, ...), are section titles rather
 * than codes a document can carry, so they are rejected.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 4
 * digits, or the `N.NNN` form the annex prints, with a single separator between the groups
 * and optional surrounding whitespace. Anything else (`"abc5102"`) is rejected instead of
 * having its digits picked out. A number is only read as a code when it is a non-negative
 * safe integer, since a sign, a decimal point or a rounded magnitude would otherwise be read
 * as a code the caller never wrote.
 *
 * @param {string|number} value - The CFOP code to be validated, with or without the `N.NNN`
 * mask, e.g. `"1.101"`, `"1101"` or `1101`.
 * @returns {boolean} True when the code is a known 4 digit CFOP code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCfop("1101"); // true
 * isValidCfop("1.101"); // true
 * isValidCfop(1101); // true
 * isValidCfop("0000"); // false
 * isValidCfop("1150"); // false (a subgroup heading, not an operable code)
 * isValidCfop("abc5102"); // false (not a documented form)
 * isValidCfop(-5102); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24
 * Anexo II of Convênio SINIEF s/nº 1970, the CFOP table in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, the consolidated text the annex belongs to.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25
 * Ajuste SINIEF 39/25, the last amendment the annex carries (CFOP 7.667, from 01.02.26).
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_007_01
 * Ajuste SINIEF 07/01, the historical text that gave the CFOP its 4 digit form.
 */
export const isValidCfop = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = typeof value === "number" ? String(value) : value.trim();

	if (!CFOP_FORMAT_REGEX.test(code)) return false;

	return sanitizeToDigits(code) in CFOP_TABLE;
};
