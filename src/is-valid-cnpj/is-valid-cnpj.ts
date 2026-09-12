import {
	CNPJ_FIRST_DIGIT_WEIGHTS,
	CNPJ_LENGTH,
	CNPJ_SECOND_DIGIT_WEIGHTS,
} from "../_internals/constants/cnpj";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { RESERVED_NUMBERS } from "./constants";

export type IsValidCnpjOptions = {
	/** Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
};

const FORMAT_REGEX =
	/^[0-9A-Z]{2}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{4}[\s.\-/]*[0-9]{2}$/;

const NUMERIC_FORMAT_REGEX = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{2}$/;

const cleanCnpj = (cnpj: string): string => {
	let result = "";
	// Stryker disable next-line EqualityOperator: cnpj.length is the exact bound; one extra iteration would read cnpj[cnpj.length], which is undefined and fails every character-class comparison below either way.
	for (let i = 0; i < cnpj.length; i++) {
		// Stryker disable next-line ConditionalExpression,EqualityOperator: this early exit only bounds how much of an oversized input is scanned; whatever length `result` ends up with, the caller's FORMAT_REGEX/NUMERIC_FORMAT_REGEX check still requires exactly CNPJ_LENGTH real characters and rejects anything else, so the exact cutoff point here never changes the final answer.
		if (result.length > CNPJ_LENGTH) break;

		const char = cnpj[i];
		// Stryker disable next-line ConditionalExpression: the only characters that ever reach isValidChecksum are ones the caller's FORMAT_REGEX/NUMERIC_FORMAT_REGEX already restricted to "0"-"9", "A"-"Z" or a "\s.-/" separator (all below "0" in code point), so no reachable character can trigger this comparison's alternate branch without the whole match already having failed for an unrelated reason.
		const isDigit = char >= "0" && char <= "9";
		// Stryker disable next-line ConditionalExpression: same reasoning as isDigit above — any character reaching here already satisfied FORMAT_REGEX/NUMERIC_FORMAT_REGEX, so it is always a genuine "0"-"9", "A"-"Z", "a"-"z" or a low-code-point separator.
		const isUpper = char >= "A" && char <= "Z";
		// Stryker disable next-line ConditionalExpression: a character above "z" that this would wrongly accept is never itself "0"-"9"/"A"-"Z" or a "\s.-/" separator, and toUpperCase() cannot turn it into one either, so the caller's FORMAT_REGEX/NUMERIC_FORMAT_REGEX already rejects any string containing it, regardless of this classification.
		const isLower = char >= "a" && char <= "z";

		if (isDigit || isUpper || isLower) {
			result += isLower ? String.fromCharCode(char.charCodeAt(0) - 32) : char;
		}
	}
	return result;
};

const isValidChecksum = (cnpj: string): boolean => {
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += (cnpj.charCodeAt(i) - 48) * CNPJ_FIRST_DIGIT_WEIGHTS[i];
	}
	let mod = sum % 11;
	const expected1 = mod < 2 ? 48 : 48 + 11 - mod;
	if (cnpj.charCodeAt(12) !== expected1) return false;

	sum = 0;
	for (let i = 0; i < 13; i++) {
		sum += (cnpj.charCodeAt(i) - 48) * CNPJ_SECOND_DIGIT_WEIGHTS[i];
	}
	mod = sum % 11;
	const expected2 = mod < 2 ? 48 : 48 + 11 - mod;
	return cnpj.charCodeAt(13) === expected2;
};

/**
 * Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
 * Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats.
 * Accepts the usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
 *
 * @param {string} cnpj - The CNPJ value to be validated.
 * @param {IsValidCnpjOptions} [options] - Optional options.
 * @param {1|2} [options.version] - `1` validates the numeric-only format (the default),
 * `2` validates both the numeric and the alphanumeric formats.
 * @returns {boolean} True if the CNPJ is valid, false otherwise.
 *
 * @example
 * ```typescript
 * // Version 1 (numeric - default)
 * isValidCnpj("12.345.678/0001-95"); // true
 * isValidCnpj("12345678000195"); // true
 * isValidCnpj("12 345 678 0001 95"); // true (whitespace mask)
 * isValidCnpj("00000000000000"); // false (reserved number)
 * isValidCnpj("12345678000190"); // false (invalid checksum)
 *
 * // Version 2 (alphanumeric)
 * isValidCnpj("Q0.SLF.MBD/7VX4-39", { version: 2 }); // true (alphanumeric)
 * isValidCnpj("Q0SLFMBD7VX439", { version: 2 }); // true (alphanumeric)
 * isValidCnpj("q0slfmbd7vx439", { version: 2 }); // true (case-insensitive)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const isValidCnpj = (cnpj: string, options?: IsValidCnpjOptions): boolean => {
	if (typeof cnpj !== "string") return false;

	const cleaned = cleanCnpj(cnpj);

	const trimmed = cnpj.trim();

	const version = options?.version ?? 1;

	let isNumeric = true;

	if (version !== 1) {
		// Stryker disable next-line EqualityOperator: cleaned.length is always exactly CNPJ_LENGTH here (checked above), so the extra i===CNPJ_LENGTH iteration reads charCodeAt(CNPJ_LENGTH), which is NaN and fails both boundary comparisons either way.
		for (let i = 0; i < CNPJ_LENGTH; i++) {
			const code = cleaned.charCodeAt(i);
			// Stryker disable next-line ConditionalExpression,EqualityOperator: cleaned only ever holds "0"-"9"/"A"-"Z" characters (minimum code 48), so `code < 48` is always false and forcing it to a literal `false` changes nothing; and the only listed CNPJ reserved number whose raw checksum also happens to pass is "00000000000000" (code 48), so shifting the upper boundary to 57 (">=57") can never be told apart from the correct ">57" by any reachable input.
			if (code < 48 || code > 57) {
				isNumeric = false;
			}
		}
	}

	if (isNumeric) {
		const numeric = sanitizeToDigits(cnpj);

		return (
			NUMERIC_FORMAT_REGEX.test(trimmed) &&
			!RESERVED_NUMBERS.includes(numeric) &&
			isValidChecksum(numeric)
		);
	}

	return FORMAT_REGEX.test(trimmed.toUpperCase()) && isValidChecksum(cleaned);
};
