import { PIS_LENGTH, PIS_WEIGHTS } from "../_internals/constants/pis";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

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
 * The eSocial MOS states the NIS must have 11 numeric digits including the check digit, and the
 * SIRC technical manual confirms the check digit is verified with módulo 11; neither publishes
 * the weight vector used below, which follows the community reference cited as `Based on:`.
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const isValidPis = (pis: string): boolean => {
	if (typeof pis !== "string") return false;

	const hasInvalidChars = /[^0-9\s().,*/-]/.test(pis);

	if (hasInvalidChars) return false;

	const digits = sanitizeToDigits(pis);

	if (digits.length !== PIS_LENGTH) return false;

	if (isRepeatedDigits(digits)) return false;

	const base = digits.slice(0, PIS_LENGTH - 1);
	const checkDigit = digits.charCodeAt(PIS_LENGTH - 1) - 48;

	const weightedChecksum = generateChecksum({ base, weight: PIS_WEIGHTS });
	const calculatedDigit = 11 - (weightedChecksum % 11);

	const finalDigit = calculatedDigit >= 10 ? 0 : calculatedDigit;

	return checkDigit === finalDigit;
};
