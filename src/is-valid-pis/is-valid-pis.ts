import { calculatePisCheckDigit } from "../_internals/calculate-pis-check-digit/calculate-pis-check-digit";
import { PIS_LENGTH } from "../_internals/constants/pis";
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
 * the weight vector used below, which follows the community reference cited as `Based on:`. No
 * official document found publishes it: the Caixa layouts that carry the number (Cadastro NIS
 * em lote, GRRF) only ask for a "Número de PIS/PASEP válido", or for a numeric value "maior que
 * zero", without saying how the check digit is computed.
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Official: https://www.caixa.gov.br/Downloads/fgts-grrf-aplicativo-arquivos/Leiaute_Folha_Pgto_GRRF_v204.pdf
 * Caixa, Leiaute GRRF v2.04, field 6 "PIS/PASEP": "Número de PIS/PASEP válido", with no algorithm.
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const isValidPis = (pis: string): boolean => {
	if (typeof pis !== "string") return false;

	const hasInvalidCharacters = /[^0-9\s().,*/-]/.test(pis);

	if (hasInvalidCharacters) return false;

	const digits = sanitizeToDigits(pis);

	if (digits.length !== PIS_LENGTH) return false;

	if (isRepeatedDigits(digits)) return false;

	return digits.charCodeAt(PIS_LENGTH - 1) - 48 === calculatePisCheckDigit(digits);
};
