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
 * Portaria DENATRAN nº 27, de 25 de janeiro de 2013, art. 1º, gives the Portaria DENATRAN nº
 * 03/86, art. 3º, its wording in force: the Código RENAVAM is "composto de 11 (onze) dígitos",
 * and "possui 10 dígitos e um dígito verificador, calculado através do módulo 11, peso 9". Read
 * as the usual módulo 11 with weights 2 to 9 from the right, that gives 3, 2, 9, 8, 7, 6, 5, 4, 3
 * and 2 over the ten base digits, the weights used here; the portaria does not write them out
 * nor say what a remainder of 0, 1 or 10 turns into, so that part follows the community
 * references cited as `Based on:`. Nor does it say how a 9 digit code issued before 1 April 2013
 * is read in 11: padding it with zeros on the left is market practice.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2013/portaria0272013.pdf
 * Portaria DENATRAN nº 27/2013, art. 1º: "10 dígitos e um dígito verificador, calculado através do
 * módulo 11, peso 9"; art. 2º: the 11 digit numbering from 1 April 2013.
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
