import { calculateRenavamCheckDigit } from "../_internals/calculate-renavam-check-digit/calculate-renavam-check-digit";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const BASE_LENGTH = 10;

/**
 * Generates a valid random RENAVAM (Registro Nacional de Veículos Automotores) number.
 *
 * The result is always the eleven digit form: ten base digits followed by the check digit. A base
 * whose digits are all the same is drawn again, since `isValidRenavam` rejects a registration like
 * `"00000000000"`.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} A valid 11-digit RENAVAM string without formatting.
 *
 * @example
 * ```typescript
 * generateRenavam(); // "12345678900"
 * ```
 *
 * The Código de Trânsito Brasileiro creates the RENAVAM registry but does not define its check
 * digit, so the algorithm follows the two community references cited as `Based on:`.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 * @see Based on: https://github.com/klawdyo/validation-br/blob/main/src/renavam.ts
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/renavam.py
 */
export const generateRenavam = (): string => {
	let base = generateRandomNumber(BASE_LENGTH);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(BASE_LENGTH);
	}

	return `${base}${calculateRenavamCheckDigit(base)}`;
};
