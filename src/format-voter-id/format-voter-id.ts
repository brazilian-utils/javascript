import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../_internals/constants/voter-id";
import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const PATTERN = "0000 0000 00 00";

const EXTENDED_PATTERN = "0000 0000 0 00 00";

const LENGTH = 12;

/**
 * Formats a Brazilian voter id (título de eleitor) for display.
 *
 * Uses the 12-digit grouping "0000 0000 00 00" by default. The 13-digit grouping
 * "0000 0000 0 00 00" is used only when the sanitized value has more than 12 digits and its
 * federative union code (the 10th and 11th digits) is "01" (São Paulo) or "02" (Minas Gerais),
 * the two states whose voter ids may carry a 9-digit sequential number.
 *
 * @param {string|number} value - The voter id value to be formatted.
 * @returns {string} The formatted voter id string.
 *
 * @example
 * ```typescript
 * formatVoterId("123456780124"); // "1234 5678 01 24"
 * formatVoterId("1234567880191"); // "1234 5678 8 01 91"
 * ```
 *
 * The 13-digit São Paulo/Minas Gerais grouping is brutils parity, not published by the TSE. A
 * 14-or-more-digit input is read the same way as a 13-digit one: it is grouped as a São Paulo or
 * Minas Gerais id whenever its 10th and 11th digits are "01"/"02". Both patterns have a fixed
 * number of slots, 12 and 13, so anything past the last slot is dropped:
 * `formatVoterId("12345678801912")` returns "1234 5678 8 01 91", the same string the 13-digit
 * value "1234567880191" produces.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const formatVoterId = (value: string | number): string => {
	if (isNullish(value)) return "";

	const digits = sanitizeToDigits(value);
	const federativeUnion = digits.slice(9, 11);
	const isExtended =
		digits.length > LENGTH && NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion);
	const pattern = isExtended ? EXTENDED_PATTERN : PATTERN;

	return format({ value: digits, pattern });
};
