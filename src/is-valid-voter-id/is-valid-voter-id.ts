import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { VOTER_ID_LENGTH } from "../_internals/constants/voter-id";

const SEPARATORS_REGEX = /[\s.]/g;

/**
 * The sequential number is either written in full as "0000 0000" or, without its leading zeros,
 * as 1 to 7 digits grouped from the right the same way ("123 4567", "1234"); the federative union
 * code and the check digits follow as two groups of 2.
 */
const FORMAT_REGEX = /^[\s.]*(?:(?:\d{1,4}[\s.]*)?\d{4}|\d{1,3})[\s.]*\d{2}[\s.]*\d{2}[\s.]*$/;

/**
 * Validates if a Brazilian voter id (título de eleitor) is valid.
 *
 * A voter id has up to 12 digits: an 8-digit sequential number, a 2-digit federative union code
 * (01-28) and 2 check digits. The TSE drops the leading zeros of the sequential number when it
 * issues the id, so a value with fewer digits is read as that id without its leading zeros and
 * left padded with zeros to 12 digits before it is checked: "123450159" is checked as
 * "000123450159". At least one sequential digit is required, so the shortest accepted value has
 * 5 digits. A 13-digit value is rejected: the resolution allows no more than 12 digits.
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
 * isValidVoterId("000123450159"); // true (12 digits, leading zeros kept)
 * isValidVoterId("123450159"); // true (the same id, issued without its leading zeros)
 * isValidVoterId("1023 8501 06 71"); // true (whitespace mask)
 * isValidVoterId("1234567880191"); // false (13 digits, more than the 12 the TSE allows)
 * isValidVoterId("123456780124"); // false (invalid checksum)
 * isValidVoterId("ab102385010671"); // false (invalid format)
 * ```
 *
 * Resolução TSE nº 23.659/2021, art. 36, sets the structure: "composto de até 12 algarismos",
 * "os oito primeiros algarismos serão sequenciais, desprezando-se, na emissão, os zeros à
 * esquerda", then the federative union code and two check digits, the first one "calculado
 * sobre o número sequencial" and the second one over the federative union code followed by the
 * first check digit. Resolução TSE nº 21.538/2003, art. 12, parágrafo único, had the same text. The
 * weights used in each step and the São Paulo/Minas Gerais remainder rule are not published by
 * the TSE and follow the community references cited as `Based on:`.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * Resolução TSE nº 23.659/2021, art. 36: "composto de até 12 algarismos", "os oito primeiros
 * algarismos serão sequenciais, desprezando-se, na emissão, os zeros à esquerda".
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const isValidVoterId = (value: string): boolean => {
	if (typeof value !== "string") return false;

	if (!FORMAT_REGEX.test(value)) return false;

	const digits = value.replace(SEPARATORS_REGEX, "").padStart(VOTER_ID_LENGTH, "0");

	// Stryker disable next-line MethodExpression: the first check digit is computed from the first eight digits only, so passing the whole value instead of the sequential part yields the same result.
	const sequentialNumber = digits.slice(0, 8);
	const federativeUnion = digits.slice(8, 10);
	const verifier = digits.slice(10);

	const ufCode = Number(federativeUnion);

	if (ufCode < 1 || ufCode > 28) return false;

	const digit1 = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
	const digit2 = calculateVoterIdSecondDigit({ federativeUnion, firstDigit: digit1 });

	return verifier === `${digit1}${digit2}`;
};
