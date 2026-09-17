import { PIS_WEIGHTS } from "../_internals/constants/pis";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const calculateCheckDigit = (base: string): string => {
	// The weighted sum is written out rather than delegated to the shared `generateChecksum`: its
	// sanitizer chain costs `generatePis` around 270 B of bundle, a 23% regression for four lines.
	const sum = PIS_WEIGHTS.reduce(
		(acc, weight, index) => acc + Number(base.charAt(index)) * weight,
		0,
	);
	const digit = 11 - (sum % 11);
	return digit >= 10 ? "0" : digit.toString();
};

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
 * the weight vector used below, which follows the community reference cited as `Based on:`.
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const generatePis = (): string => {
	let base = generateRandomNumber(10);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(10);
	}

	return `${base}${calculateCheckDigit(base)}`;
};
