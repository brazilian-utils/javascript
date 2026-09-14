import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../_internals/constants/voter-id";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { EXTENDED_LENGTH, LENGTH } from "./constants";

/**
 * Removes voter id (título de eleitor) formatting characters and returns only digits.
 *
 * Keeps up to 13 digits when the 10th and 11th digits identify São Paulo ("01") or Minas
 * Gerais ("02"), since those states may issue voter ids with a 9-digit sequential number;
 * otherwise keeps up to the usual 12 digits.
 *
 * @param {string|number} value - The voter id value to be parsed.
 * @returns {string} The voter id value without formatting.
 *
 * @example
 * ```typescript
 * parseVoterId("1234 5678 01 24"); // "123456780124"
 * parseVoterId("1234 5678 8 01 91"); // "1234567880191"
 * ```
 *
 * The 13-digit São Paulo/Minas Gerais cap is brutils parity, not published by the TSE. A
 * 14-or-more-digit input whose 10th and 11th digits are "01"/"02" is read as a 13-digit São Paulo
 * or Minas Gerais id and capped at 13 digits, discarding anything past that.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const parseVoterId = (value: string | number): string => {
	const digits = sanitizeToDigits(value);

	const federativeUnion = digits.slice(9, 11);

	const maxLength = NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion)
		? EXTENDED_LENGTH
		: LENGTH;

	return digits.slice(0, maxLength);
};
