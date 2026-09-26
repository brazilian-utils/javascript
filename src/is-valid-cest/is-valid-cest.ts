import { CEST_FORMAT_REGEX, CEST_TABLE } from "../_internals/constants/cest";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const CEST_LENGTH = 7;

/**
 * Validates if a CEST (Código Especificador da Substituição Tributária) is listed in the annexes
 * of Convênio ICMS 142/18.
 *
 * The table is Anexos II to XXVI of the consolidated text in force (last amended by Convênio
 * ICMS 180/24). Only the items in force count: a revoked item (`"03.001.00"`) is rejected. The
 * check is about the code alone, it does not tell whether the code suits a given NCM or whether
 * a state applies the regime to it.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 7
 * digits, or the `NN.NNN.NN` form the annexes print, with a single separator (space, `.`, `-`
 * or `/`) between the groups and optional surrounding whitespace. A number is only read as a
 * code when it is a non-negative safe integer.
 *
 * The leading zero of segments 01 to 09 is part of the code, so a value written as bare digits
 * is left padded with zeros to 7 whether it comes as a string or as a number: `100100`,
 * `"100100"` and `"0100100"` are the same code.
 *
 * @param {string|number} value - The CEST to be validated, with or without the `NN.NNN.NN`
 * mask, e.g. `"01.001.00"`, `"0100100"` or `100100`.
 * @returns {boolean} True when the code is a 7 digit CEST in force, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCest("01.001.00"); // true
 * isValidCest("0100100"); // true
 * isValidCest(100100); // true (padded to 7 digits, so this is "0100100")
 * isValidCest("03.001.00"); // false (a revoked item)
 * isValidCest("0000000"); // false
 * isValidCest("abc0100100"); // false (not a documented form)
 * isValidCest(-100100); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18
 * Convênio ICMS 142/18, the consolidated text: cláusula sexta, IV (the 7 digits) and Anexos II
 * to XXVI (the codes).
 */
export const isValidCest = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const cest = padLookupCode(value, CEST_LENGTH);

	return CEST_FORMAT_REGEX.test(cest) && CEST_TABLE[sanitizeToDigits(cest)] !== undefined;
};
