import { calculatePisCheckDigit } from "../_internals/calculate-pis-check-digit/calculate-pis-check-digit";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

/**
 * Generates a valid random Brazilian PIS (Programa de Integração Social) number.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} A valid 11-digit PIS string without formatting.
 *
 * @example
 * ```typescript
 * generatePis(); // "12056874107"
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
export const generatePis = (): string => {
	let base = generateRandomNumber(10);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(10);
	}

	return `${base}${calculatePisCheckDigit(base)}`;
};
