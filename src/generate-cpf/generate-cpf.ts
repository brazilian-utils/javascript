import { type StateCode } from "../_internals/constants/states";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { BASE_LENGTH, STATE_CODES } from "./constants";

const getStateCode = (state?: StateCode): string => {
	if (state && Object.hasOwn(STATE_CODES, state)) return STATE_CODES[state];
	return generateRandomNumber(1);
};

const calculateCheckDigit = (base: string, weight: number): string => {
	const mod = generateChecksum({ base, weight }) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

/**
 * Generates a valid random CPF (Cadastro de Pessoas Físicas).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {StateCode} state - Optional. The Brazilian state code to generate a CPF for.
 * @returns {string} A valid 11-digit CPF string without formatting.
 *
 * @example
 * ```typescript
 * generateCpf(); // "12345678909"
 * generateCpf("SP"); // "12345678810" (with the SP state code, 8, in the 9th digit)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Based on: https://github.com/brazilian-utils/brutils-python/blob/main/brutils/cpf.py
 */
export const generateCpf = (state?: StateCode): string => {
	let base = generateRandomNumber(BASE_LENGTH) + getStateCode(state);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(BASE_LENGTH) + getStateCode(state);
	}

	const firstCheckDigit = calculateCheckDigit(base, 10);
	const secondCheckDigit = calculateCheckDigit(base + firstCheckDigit, 11);
	return base + firstCheckDigit + secondCheckDigit;
};
