const FIRST_MULTIPLIER = 2;

const LAST_MULTIPLIER = 9;

const MODULUS = 11;

const SUM_SCALE = 10;

const OVERFLOW_DIGIT = 10;

/**
 * Calculates the check digit of a RENAVAM (Registro Nacional de Veículos Automotores) base, the
 * eleventh digit of the registration.
 *
 * The ten base digits are read from right to left and multiplied by 2, 3, 4, 5, 6, 7, 8, 9 and
 * then 2 again, cycling back whenever the multiplier passes 9. The weighted sum is multiplied by
 * ten and the check digit is the remainder of that product by eleven, with a remainder of ten
 * mapped back to 0.
 *
 * The digit is the very same one `mod11`'s `arrecadacao` mapping yields, for every possible base,
 * but the loop is written out here rather than delegated to it: pulling the shared, table driven
 * `mod11` into this module costs `isValidRenavam` and `generateRenavam` around 100 B of bundle
 * each, which the tree-shaking budget of this package does not spend on eight lines.
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
 * @param {string} base - The ten digits that precede the check digit.
 * @returns {number} The check digit, 0 to 9.
 *
 * @example
 * ```typescript
 * calculateRenavamCheckDigit("0063988496"); // 2
 * calculateRenavamCheckDigit("1234567890"); // 0
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2013/portaria0272013.pdf
 * Portaria DENATRAN nº 27/2013, art. 1º: "10 dígitos e um dígito verificador, calculado através do
 * módulo 11, peso 9"; art. 2º: the 11 digit numbering from 1 April 2013.
 * @see Based on: https://github.com/klawdyo/validation-br/blob/main/src/renavam.ts
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/renavam.py
 */
export const calculateRenavamCheckDigit = (base: string): number => {
	let sum = 0;
	let multiplier = FIRST_MULTIPLIER;

	for (let index = base.length - 1; index >= 0; index--) {
		sum += Number.parseInt(base.charAt(index), 10) * multiplier;

		multiplier = multiplier >= LAST_MULTIPLIER ? FIRST_MULTIPLIER : multiplier + 1;
	}

	const digit = (sum * SUM_SCALE) % MODULUS;

	return digit === OVERFLOW_DIGIT ? 0 : digit;
};
