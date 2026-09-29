import { CBO_CODES, CBO_FORMAT_REGEX } from "../_internals/constants/cbo";
import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CBO_LENGTH } from "./constants";

/**
 * Validates if a CBO (Classificação Brasileira de Ocupações) code exists in the official
 * CBO 2002 table.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 6 digits,
 * or the `NNNN-NN` mask, with any run of separators (whitespace, `.`, `-` or `/`) between the
 * groups and optional surrounding whitespace. A number is only read as a code when it is a
 * non-negative safe integer.
 *
 * A CBO code is always 6 digits and its leading zeros are part of it, so a value written as
 * bare digits is left padded with zeros to 6 whether it comes as a string or as a number:
 * `10205`, `"10205"` and `"010205"` are the same code.
 *
 * @param {string|number} value - The CBO code to be validated, with or without the hyphen
 * mask, e.g. `"2124-05"`, `"212405"` or `212405`.
 * @returns {boolean} True when the code is a known 6 digit occupation code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCbo("2124-05"); // true
 * isValidCbo("212405"); // true
 * isValidCbo(212405); // true
 * isValidCbo(10205); // true (padded to 6 digits, so this is "010205")
 * isValidCbo("10205"); // true (padded to 6 digits, so this is "010205")
 * isValidCbo("999999"); // false
 * isValidCbo("2124abc05"); // false (not a documented form)
 * isValidCbo(-212405); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://cbo.mte.gov.br/cbosite/pages/downloads.jsf
 * "Estrutura CBO (CSV)", the CBO 2002 tables the Ministério do Trabalho e Emprego publishes (files
 * of 10/07/2026, 2,725 occupations).
 */
export const isValidCbo = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = padLookupCode(value, CBO_LENGTH);

	if (!CBO_FORMAT_REGEX.test(code)) return false;

	return findCodeIndex(CBO_CODES, sanitizeToDigits(code)) !== -1;
};
