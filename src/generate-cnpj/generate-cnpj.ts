import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../_internals/constants/cnpj";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const BASE_LENGTH = 12;

const VALID_CNPJ_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const generateRandomCnpjChar = (): string =>
	VALID_CNPJ_CHARS.charAt(Math.floor(Math.random() * VALID_CNPJ_CHARS.length));

const generateAlphanumericCnpjBase = (): string => {
	let base = "";
	for (let i = 0; i < BASE_LENGTH; i++) {
		base += generateRandomCnpjChar();
	}
	return base;
};

const generateNonRepeatedBase = (generate: () => string): string => {
	let base = generate();
	while (isRepeatedDigits(base)) {
		base = generate();
	}
	return base;
};

const charToCnpjValue = (char: string): number => char.charCodeAt(0) - 48;

const generateAlphanumericChecksum = (cnpj: string, weights: number[]): number =>
	weights.reduce((sum, weight, index) => sum + charToCnpjValue(cnpj.charAt(index)) * weight, 0);

const calculateCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateChecksum({ base, weight: weights }) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const calculateAlphanumericCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateAlphanumericChecksum(base, weights) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const generateNumericCnpj = (): string => {
	const base = generateNonRepeatedBase(() => generateRandomNumber(BASE_LENGTH));
	const firstCheckDigit = calculateCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateCheckDigit(base + firstCheckDigit, CNPJ_SECOND_DIGIT_WEIGHTS);
	return base + firstCheckDigit + secondCheckDigit;
};

const generateAlphanumericCnpj = (): string => {
	const base = generateNonRepeatedBase(generateAlphanumericCnpjBase);
	const firstCheckDigit = calculateAlphanumericCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateAlphanumericCheckDigit(
		base + firstCheckDigit,
		CNPJ_SECOND_DIGIT_WEIGHTS,
	);
	return base + firstCheckDigit + secondCheckDigit;
};

/**
 * Generates a valid random CNPJ (Cadastro Nacional da Pessoa Jurídica).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {1 | 2} version - The version of the CNPJ to be generated.
 * @returns {string} A valid 14-digit CNPJ string without formatting.
 *
 * @example
 * ```typescript
 * generateCnpj(); // "12345678000195"
 * generateCnpj(2); // "Q0SLFMBD7VX439"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 */
export const generateCnpj = (version?: 1 | 2): string => {
	const versionToUse = version ?? 1;
	if (versionToUse === 1) return generateNumericCnpj();
	return generateAlphanumericCnpj();
};
