import { CNAE_CODES, CNAE_FORMAT_REGEX } from "../_internals/constants/cnae";
import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CNAE_LENGTH } from "./constants";

/**
 * Validates if a CNAE (Classificação Nacional de Atividades Econômicas) subclass code
 * exists in the official CNAE-Subclasses 2.3 table, the current subclass revision of CNAE 2.0.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 7
 * digits, or the `NNNN-N/NN` mask, with a single separator (space, `.`, `-` or `/`) between the groups and optional
 * surrounding whitespace. A number is only read as a code when it is a non-negative safe
 * integer.
 *
 * A CNAE subclass code is always 7 digits and its leading zeros are part of it, so a value
 * written as bare digits is left padded with zeros to 7 whether it comes as a string or as a
 * number: `111301`, `"111301"` and `"0111301"` are the same code.
 *
 * @param {string|number} value - The CNAE code to be validated, with or without the
 * `NNNN-N/NN` mask, e.g. `"6201-5/01"`, `"6201501"` or `6201501`.
 * @returns {boolean} True when the code is a known 7 digit subclass, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnae("6201-5/01"); // true
 * isValidCnae("6201501"); // true
 * isValidCnae(6201501); // true
 * isValidCnae(111301); // true (padded to 7 digits, so this is "0111301")
 * isValidCnae("111301"); // true (padded to 7 digits, so this is "0111301")
 * isValidCnae("0000000"); // false
 * isValidCnae("0111abc301"); // false (not a documented form)
 * isValidCnae(-111301); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 * @see Official: https://concla.ibge.gov.br/busca-online-cnae.html
 * CONCLA's CNAE search and structure browser, which publishes CNAE-Subclasses 2.3.
 */
export const isValidCnae = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const subclass = padLookupCode(value, CNAE_LENGTH);

	if (!CNAE_FORMAT_REGEX.test(subclass)) return false;

	return findCodeIndex(CNAE_CODES, sanitizeToDigits(subclass)) !== -1;
};
