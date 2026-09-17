const MODULUS = 11;

/**
 * Calculates a check digit of a CPF (Cadastro de Pessoas Físicas) base.
 *
 * Each digit of the base is multiplied by a weight that starts one above the length of the base
 * and decreases down to 2, so the 9 digit base of the first check digit weighs 10 to 2 and the
 * 10 digit base (the first 9 digits plus the first check digit) of the second one weighs 11 to
 * 2. The check digit is 11 minus the remainder of the weighted sum by 11, or 0 when that
 * remainder is 0 or 1.
 *
 * @param {string} base - The 9 or 10 digits that precede the check digit.
 * @returns {number} The check digit, 0 to 9.
 *
 * @example
 * ```typescript
 * calculateCpfCheckDigit("123456789"); // 0
 * calculateCpfCheckDigit("1234567890"); // 9
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cpf
 */
export const calculateCpfCheckDigit = (base: string): number => {
	let sum = 0;
	let weight = base.length + 1;

	for (let index = 0; index < base.length; index++) {
		sum += (base.charCodeAt(index) - 48) * weight;
		weight--;
	}

	const remainder = sum % MODULUS;

	return remainder < 2 ? 0 : MODULUS - remainder;
};
