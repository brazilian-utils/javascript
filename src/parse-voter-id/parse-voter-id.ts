import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../_internals/constants/voter-id";
import { isNullish } from "../_internals/is-nullish/is-nullish";
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
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2003/resolucao-no-21-538-de-14-de-outubro-de-2003
 */
export const parseVoterId = (value: string | number): string => {
	if (isNullish(value)) return "";

	const digits = sanitizeToDigits(value);

	const federativeUnion = digits.slice(9, 11);

	const maxLength = NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion)
		? EXTENDED_LENGTH
		: LENGTH;

	return digits.slice(0, maxLength);
};
