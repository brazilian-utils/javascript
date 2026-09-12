import { PIS_WEIGHTS } from "../_internals/constants/pis";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const calculateCheckDigit = (base: string): string => {
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
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 */
export const generatePis = (): string => {
	let base = generateRandomNumber(10);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(10);
	}

	return `${base}${calculateCheckDigit(base)}`;
};
