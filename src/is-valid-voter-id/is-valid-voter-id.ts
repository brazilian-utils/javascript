import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { NINE_DIGIT_FEDERATIVE_UNION_CODES } from "../_internals/constants/voter-id";

const SEPARATORS_REGEX = /[\s.]/g;

const FORMAT_REGEX = /^[\s.]*\d{4}[\s.]*\d{4}[\s.]*(?:\d[\s.]*)?\d{2}[\s.]*\d{2}[\s.]*$/;

/**
 * Validates if a Brazilian voter id (título de eleitor) is valid.
 *
 * A voter id normally has 12 digits: an 8-digit sequential number, a 2-digit federative
 * union code (01-28) and a 2-digit verification code. São Paulo (01) and Minas Gerais (02)
 * may instead issue voter ids with a 9-digit sequential number, totalling 13 digits.
 *
 * Whitespace and dots are accepted around and between the "0000 0000 00 00" groups, but any
 * other character, a letter in particular, makes the value invalid.
 *
 * @param {string} value - The voter id value to be validated.
 * @returns {boolean} True if the voter id is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidVoterId("102385010671"); // true (12 digits)
 * isValidVoterId("1234567880191"); // true (13 digits, São Paulo)
 * isValidVoterId("1023 8501 06 71"); // true (whitespace mask)
 * isValidVoterId("123456780124"); // false (invalid checksum)
 * isValidVoterId("ab102385010671"); // false (invalid format)
 * ```
 *
 * Resolução TSE nº 23.659/2021, art. 36, parágrafo único, confirms the federative union table and
 * the two-step módulo 11 structure ("até 12 algarismos"). The weights used in each step and the
 * 13-digit São Paulo/Minas Gerais ids are brutils parity, not published by the TSE — siga0984 uses
 * a different 9-digit rule for the sequential number.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const isValidVoterId = (value: string): boolean => {
	if (typeof value !== "string") return false;

	if (!FORMAT_REGEX.test(value)) return false;

	const digits = value.replace(SEPARATORS_REGEX, "");

	// Stryker disable next-line MethodExpression: the check digits are computed from the first eight digits only, so passing the whole value instead of the sequential part yields the same result.
	const sequentialNumber = digits.slice(0, -4);
	const federativeUnion = digits.slice(-4, -2);
	const verifier = digits.slice(-2);

	if (digits.length === 13 && !NINE_DIGIT_FEDERATIVE_UNION_CODES.includes(federativeUnion)) {
		return false;
	}

	const ufCode = Number(federativeUnion);

	if (ufCode < 1 || ufCode > 28) return false;

	const digit1 = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
	const digit2 = calculateVoterIdSecondDigit({ federativeUnion, firstDigit: digit1 });

	return verifier === `${digit1}${digit2}`;
};
