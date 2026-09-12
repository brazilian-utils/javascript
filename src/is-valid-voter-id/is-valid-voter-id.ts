import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../_internals/constants/voter-id";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const isValidLength = (value: string): boolean => {
	if (value.length === 12) return true;

	const federativeUnion = value.slice(-4, -2);
	return value.length === 13 && NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion);
};

/**
 * Validates if a Brazilian voter id (título de eleitor) is valid.
 *
 * A voter id normally has 12 digits: an 8-digit sequential number, a 2-digit federative
 * union code (01-28) and a 2-digit verification code. São Paulo (01) and Minas Gerais (02)
 * may instead issue voter ids with a 9-digit sequential number, totalling 13 digits.
 *
 * @param {string} value - The voter id value to be validated.
 * @returns {boolean} True if the voter id is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidVoterId("102385010671"); // true (12 digits)
 * isValidVoterId("1234567880191"); // true (13 digits, São Paulo)
 * isValidVoterId("123456780124"); // false (invalid checksum)
 * ```
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2003/resolucao-no-21-538-de-14-de-outubro-de-2003
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/
 * @see Based on: https://github.com/brazilian-utils/brutils-python/blob/main/brutils/voter_id.py (13-digit São Paulo and Minas Gerais ids)
 */
export const isValidVoterId = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (!isValidLength(digits)) return false;

	// Stryker disable next-line MethodExpression: the check digits are computed from the first eight digits only, so passing the whole value instead of the sequential part yields the same result.
	const sequentialNumber = digits.slice(0, -4);
	const federativeUnion = digits.slice(-4, -2);
	const verifier = digits.slice(-2);

	const ufCode = Number(federativeUnion);

	if (ufCode < 1 || ufCode > 28) return false;

	const digit1 = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
	const digit2 = calculateVoterIdSecondDigit({ federativeUnion, firstDigit: digit1 });

	return verifier === `${digit1}${digit2}`;
};
