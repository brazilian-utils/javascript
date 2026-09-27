import { VOTER_ID_LENGTH } from "../_internals/constants/voter-id";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes voter id (título de eleitor) formatting characters and returns only digits.
 *
 * Keeps up to the 12 digits a voter id may have and drops anything past them. A value with fewer
 * digits is returned as it is, not padded: a voter id issued without the leading zeros of its
 * sequential number keeps that shorter form, which `isValidVoterId` accepts; `formatVoterId` with
 * `pad: true` restores the zeros.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The voter id value to be parsed.
 * @returns {string} The voter id value without formatting.
 *
 * @example
 * ```typescript
 * parseVoterId("1234 5678 01 24"); // "123456780124"
 * parseVoterId("1234 5678 01 24 99"); // "123456780124" (digits past the 12th are dropped)
 * parseVoterId("12345 01 59"); // "123450159" (no leading zeros are added)
 * parseVoterId(-123456780124); // "" (not a non-negative safe integer)
 * ```
 *
 * Resolução TSE nº 23.659/2021, art. 36, gives the voter id "até 12 algarismos", so no 13-digit
 * form is kept.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * Resolução TSE nº 23.659/2021, art. 36: "composto de até 12 algarismos".
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const parseVoterId = (value: string | number): string => {
	if (!isLookupCode(value)) return "";

	return sanitizeToDigits(value).slice(0, VOTER_ID_LENGTH);
};
