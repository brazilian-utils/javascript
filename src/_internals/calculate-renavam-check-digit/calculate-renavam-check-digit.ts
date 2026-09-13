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
 * The Código de Trânsito Brasileiro creates the RENAVAM registry but does not define its check
 * digit, so the calculation follows the two community references cited below.
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
