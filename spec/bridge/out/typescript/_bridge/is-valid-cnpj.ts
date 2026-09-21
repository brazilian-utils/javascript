// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

/** `isValidCnpj`, written once. */

import { classHas, codeAt, keepClass, patternTest, type CharClass, type PatternStep } from "./_runtime.ts";

const class0: CharClass = [[0x30, 0x39], [0x41, 0x5a]];
const class1: CharClass = [[0x9, 0xd], [0x20, 0x20], [0x2d, 0x2f], [0xa0, 0xa0], [0x1680, 0x1680], [0x2000, 0x200a], [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x205f], [0x3000, 0x3000], [0xfeff, 0xfeff]];
const class2: CharClass = [[0x30, 0x39]];
const class3: CharClass = [[0x41, 0x5a]];
const class4: CharClass = [[0x30, 0x39], [0x41, 0x5a], [0x61, 0x7a]];

const PATTERN_ALPHANUMERIC_FORMAT: readonly PatternStep[] = [
	{ charClass: class0, min: 2, max: 2, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class0, min: 3, max: 3, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class0, min: 3, max: 3, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class0, min: 4, max: 4, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class2, min: 2, max: 2, capture: false },
];

const PATTERN_NUMERIC_FORMAT: readonly PatternStep[] = [
	{ charClass: class2, min: 2, max: 2, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class2, min: 3, max: 3, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class2, min: 3, max: 3, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class2, min: 4, max: 4, capture: false },
	{ charClass: class1, min: 0, max: -1, capture: false },
	{ charClass: class2, min: 2, max: 2, capture: false },
];

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];





/** Options of `isValidCnpj`. */
export type IsValidCnpjOptions = {
	/** Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
};



/**
 * Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
 *
 * Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
 * usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
 *
 * @param {string} cnpj - The CNPJ value to be validated.
 * @param {IsValidCnpjOptions} [options] - Optional options.
 * @returns {boolean} True if the CNPJ is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnpj("12.345.678/0001-95"); // true
 * isValidCnpj("q0slfmbd7vx439", { version: 2 }); // true
 * isValidCnpj("00000000000000"); // false (reserved number)
 * ```
 */
export const isValidCnpj = (cnpj: string, options?: IsValidCnpjOptions): boolean => {
	const optionsVersion = options?.version ?? -1;
	if (typeof cnpj !== "string") {
		return false;
	}
	const trimmed = cnpj.trim();
	if ((optionsVersion === 2)) {
		const cleaned = keepClass(class4, cnpj).toUpperCase();
		if (classHas(class3, cleaned)) {
			if (!patternTest(PATTERN_ALPHANUMERIC_FORMAT, trimmed.toUpperCase())) {
				return false;
			}
			return hasValidChecksum(cleaned);
		}
	}
	const numeric = keepClass(class2, cnpj);
	if (!patternTest(PATTERN_NUMERIC_FORMAT, trimmed)) {
		return false;
	}
	if (isRepeated(numeric)) {
		return false;
	}
	return hasValidChecksum(numeric);
};

/**
 * Computes one CNPJ check digit from the base and its weight vector.
 *
 * @param {string} base - The sanitized CNPJ, of which only the base is read.
 * @param {number[]} weights - The weight vector of the digit being computed.
 * @returns {number} The check digit.
 */
const checkDigit = (base: string, weights: number[]): number => {
	let sum = 0;
	for (let index = 0; index < weights.length; index++) {
		sum = (sum + ((codeAt(base, index) - 48) * weights[index]));
	}
	const remainder = (sum % 11);
	if ((remainder < 2)) {
		return 0;
	}
	return (11 - remainder);
};

/**
 * Whether both check digits of a sanitized 14 character CNPJ match its base.
 *
 * @param {string} cnpj - The sanitized CNPJ.
 * @returns {boolean} True when both check digits match.
 */
const hasValidChecksum = (cnpj: string): boolean => {
	if (((codeAt(cnpj, 12) - 48) !== checkDigit(cnpj, FIRST_DIGIT_WEIGHTS))) {
		return false;
	}
	return ((codeAt(cnpj, 13) - 48) === checkDigit(cnpj, SECOND_DIGIT_WEIGHTS));
};

/**
 * Whether every character of the value is the same one.
 *
 * @param {string} value - The value.
 * @returns {boolean} True when the value repeats one character.
 */
const isRepeated = (value: string): boolean => {
	if ((value.length === 0)) {
		return false;
	}
	for (let index = 1; index < value.length; index++) {
		if ((codeAt(value, index) !== codeAt(value, 0))) {
			return false;
		}
	}
	return true;
};
