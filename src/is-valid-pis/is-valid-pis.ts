import { PIS_LENGTH, PIS_WEIGHTS } from "../_internals/constants/pis";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { RESERVED_NUMBERS } from "./constants";

/**
 * Validates a Brazilian PIS (Programa de Integração Social) number.
 * Accepts the usual mask characters (`.`, `-`, `/`, `(`, `)`, `,`, `*`) and whitespace.
 *
 * @param {string} pis - The PIS number to validate.
 * @returns {boolean} True if the PIS number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidPis("120.56874.10-7"); // true
 * isValidPis("120/56874/10-7"); // true
 * isValidPis("12056874107"); // true
 * isValidPis("00000000000"); // false (reserved number)
 * ```
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Based on: https://github.com/brazilian-utils/brutils-python/blob/main/brutils/pis.py
 */
export const isValidPis = (pis: string): boolean => {
	if (typeof pis !== "string") return false;

	const hasInvalidChars = /[^0-9\s().,*/-]/.test(pis);

	if (hasInvalidChars) return false;

	const digits = sanitizeToDigits(pis);

	if (digits.length !== PIS_LENGTH) return false;

	if (RESERVED_NUMBERS.includes(digits)) return false;

	const base = digits.slice(0, PIS_LENGTH - 1);
	const checkDigit = digits.charCodeAt(PIS_LENGTH - 1) - 48;

	const weightedChecksum = generateChecksum({ base, weight: PIS_WEIGHTS });
	const calculatedDigit = 11 - (weightedChecksum % 11);

	const finalDigit = calculatedDigit >= 10 ? 0 : calculatedDigit;

	return checkDigit === finalDigit;
};
