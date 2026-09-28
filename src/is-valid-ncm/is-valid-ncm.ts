import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { NCM_CODES, NCM_FORMAT_REGEX } from "./constants";

const NCM_LENGTH = 8;

/**
 * Validates if a NCM (Nomenclatura Comum do Mercosul) code exists in the official table.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 8
 * digits, or the `NNNN.NN.NN` mask, with a single separator between the groups and optional
 * surrounding whitespace. Anything else (`"abc01012100"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
 *
 * An NCM code is always 8 digits and its leading zeros are part of it, so a value written as
 * bare digits is left padded with zeros to 8 whether it comes as a string or as a number:
 * `1012100`, `"1012100"` and `"01012100"` are the same code. A masked value already carries its
 * separators and is read as written.
 *
 * @param {string|number} value - The NCM code to be validated, with or without the
 * `NNNN.NN.NN` mask.
 * @returns {boolean} True when the code is a known 8 digit NCM code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidNcm("0101.21.00"); // true
 * isValidNcm("01012100"); // true
 * isValidNcm(1012100); // true (padded to 8 digits, so this is "01012100")
 * isValidNcm("1012100"); // true (padded to 8 digits, so this is "01012100")
 * isValidNcm("00000000"); // false
 * isValidNcm("abc01012100"); // false (not a documented form)
 * isValidNcm(-84713012); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 * Nomenclature of the Portal Único Siscomex. The bundled codes are the 10,515 eight digit codes of
 * the file "Vigente em 26/09/2026", whose latest act is Resolução Gecex nº 926/2026.
 */
export const isValidNcm = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = padLookupCode(value, NCM_LENGTH);

	if (!NCM_FORMAT_REGEX.test(code)) return false;

	return findCodeIndex(NCM_CODES, sanitizeToDigits(code)) !== -1;
};
