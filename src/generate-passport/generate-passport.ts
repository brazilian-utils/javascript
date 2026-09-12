import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { ALPHABET_LENGTH, CHAR_CODE_A, DIGITS_LENGTH, LETTERS_LENGTH } from "./constants";

/**
 * Generates a random valid Brazilian passport number.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} A random valid passport number string (e.g. "RY393097").
 *
 * @example
 * generatePassport() // "RY393097"
 * generatePassport() // "ZS840088"
 *
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte
 */
export const generatePassport = (): string => {
	const letters = Array.from({ length: LETTERS_LENGTH }, () =>
		String.fromCharCode(CHAR_CODE_A + Math.floor(Math.random() * ALPHABET_LENGTH)),
	).join("");

	const digits = generateRandomNumber(DIGITS_LENGTH);

	return `${letters}${digits}`;
};
