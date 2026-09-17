const MODULUS = 11;

/**
 * Calculates a check digit of a CNPJ (Cadastro Nacional da Pessoa Jurídica) base, under the rule
 * both CNPJ versions share.
 *
 * Each character of the base is read as its code point minus 48, which is the digit itself for
 * `0` to `9` and the value the alphanumeric CNPJ assigns to `A` to `Z` (17 to 42), so the numeric
 * version goes through the very same calculation instead of a second, digits-only one. Each value
 * is multiplied by the weight at its position, and the check digit is 11 minus the remainder of
 * the weighted sum by 11, or 0 when that remainder is 0 or 1.
 *
 * @param {string} base - The characters that precede the check digit, at least as long as `weights`.
 * @param {readonly number[]} weights - The weight of each character of the base, from left to right.
 * @returns {number} The check digit, 0 to 9.
 *
 * @example
 * ```typescript
 * calculateCnpjCheckDigit("123456780001", [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); // 9
 * calculateCnpjCheckDigit("Q0SLFMBD7VX4", [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); // 3
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 */
export const calculateCnpjCheckDigit = (base: string, weights: readonly number[]): number => {
	let sum = 0;

	for (let index = 0; index < weights.length; index++) {
		sum += (base.charCodeAt(index) - 48) * weights[index];
	}

	const remainder = sum % MODULUS;

	return remainder < 2 ? 0 : MODULUS - remainder;
};
