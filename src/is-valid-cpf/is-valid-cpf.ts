import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { RESERVED_NUMBERS } from "./constants";

const FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{2}$/;

const isValidChecksum = (cpf: string): boolean => {
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += (cpf.charCodeAt(i) - 48) * (10 - i);
	}
	let mod = sum % 11;
	const expected1 = mod < 2 ? 48 : 48 + 11 - mod;
	if (cpf.charCodeAt(9) !== expected1) return false;

	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += (cpf.charCodeAt(i) - 48) * (11 - i);
	}
	mod = sum % 11;
	const expected2 = mod < 2 ? 48 : 48 + 11 - mod;
	return cpf.charCodeAt(10) === expected2;
};

/**
 * Validates if a CPF (Cadastro de Pessoas Físicas) is valid.
 * Accepts the usual mask characters (`.`, `-`) and whitespace around and between groups.
 *
 * @param {string} cpf - The CPF value to be validated.
 * @returns {boolean} True if the CPF is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCpf("123.456.789-09"); // true
 * isValidCpf("12345678909"); // true
 * isValidCpf("123 456 789 09"); // true (whitespace mask)
 * isValidCpf(" 12345678909"); // true (leading whitespace)
 * isValidCpf("00000000000"); // false (reserved number)
 * isValidCpf("12345678900"); // false (invalid checksum)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 */
export const isValidCpf = (cpf: string): boolean => {
	if (typeof cpf !== "string") return false;

	const digits = sanitizeToDigits(cpf);

	if (!FORMAT_REGEX.test(cpf.trim())) return false;

	if (RESERVED_NUMBERS.includes(digits)) return false;

	return isValidChecksum(digits);
};
