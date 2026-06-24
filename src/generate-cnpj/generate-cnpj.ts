import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";

const BASE_LENGTH = 12;

const FIRST_CHECK_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const SECOND_CHECK_DIGIT_WEIGHTS = [6, ...FIRST_CHECK_DIGIT_WEIGHTS];

const VALID_CNPJ_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const generateRandomCnpjChar = (): string =>
	VALID_CNPJ_CHARS[Math.floor(Math.random() * VALID_CNPJ_CHARS.length)];

const generateAlphanumericCnpjBase = (): string => {
	let base = "";
	for (let i = 0; i < BASE_LENGTH; i++) {
		base += generateRandomCnpjChar();
	}
	return base;
};

const charToCnpjValue = (char: string): number => char.charCodeAt(0) - 48;

const generateAlphanumericChecksum = (cnpj: string, weights: number[]): number => {
	let sum = 0;
	for (let i = 0; i < cnpj.length; i++) {
		sum += charToCnpjValue(cnpj[i]) * weights[i];
	}
	return sum;
};

const calculateCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateChecksum({ base, weight: weights }) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const calculateAlphanumericCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateAlphanumericChecksum(base, weights) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const generateNumericCnpj = (): string => {
	const base = generateRandomNumber(BASE_LENGTH);
	const firstCheckDigit = calculateCheckDigit(base, FIRST_CHECK_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateCheckDigit(base + firstCheckDigit, SECOND_CHECK_DIGIT_WEIGHTS);
	return base + firstCheckDigit + secondCheckDigit;
};

const generateAlphanumericCnpj = (): string => {
	const base = generateAlphanumericCnpjBase();
	const firstCheckDigit = calculateAlphanumericCheckDigit(base, FIRST_CHECK_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateAlphanumericCheckDigit(
		base + firstCheckDigit,
		SECOND_CHECK_DIGIT_WEIGHTS,
	);
	return base + firstCheckDigit + secondCheckDigit;
};

/**
 * Generates a valid random CNPJ (Cadastro Nacional da Pessoa Jurídica).
 *
 * @param {1 | 2} version - The version of the CNPJ to be generated.
 * @returns {string} A valid 14-digit CNPJ string without formatting.
 *
 * @example
 * ```typescript
 * generateCnpj(); // "12345678000195"
 * generateCnpj(2); // "Q0SLFMBD7VX439"
 * ```
 */
export const generateCnpj = (version?: 1 | 2): string => {
	const versionToUse = version ?? 1;
	if (versionToUse === 1) return generateNumericCnpj();
	return generateAlphanumericCnpj();
};
