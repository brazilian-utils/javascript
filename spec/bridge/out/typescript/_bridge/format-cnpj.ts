// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

/** `formatCnpj`, written once. */

import { asString, codeAt, isTruthy, keepClass, padStart, type CharClass } from "./_runtime.ts";

const class0: CharClass = [[0x30, 0x39]];
const class1: CharClass = [[0x30, 0x39], [0x41, 0x5a], [0x61, 0x7a]];

const PATTERN = "00.000.000/0000-00";
const OBFUSCATED_PATTERN = "**.000.000/0000-**";

/** Options of `formatCnpj`. */
export type FormatCnpjOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
	/** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`). */
	obfuscate?: boolean;
};

/**
 * Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
 *
 * @param {string} value - The CNPJ value to be formatted.
 * @param {FormatCnpjOptions} [options] - Optional configuration for formatting the CNPJ.
 * @returns {string} The formatted CNPJ string in the pattern "00.000.000/0000-00".
 *
 * @example
 * ```typescript
 * formatCnpj("12345678000195"); // "12.345.678/0001-95"
 * formatCnpj("12345678", { pad: true }); // "00.000.012/3456-78"
 * formatCnpj("q0SLFMBD7VX439", { version: 2 }); // "Q0.SLF.MBD/7VX4-39"
 * formatCnpj("12345678000195", { obfuscate: true }); // "**.345.678/0001-**"
 * ```
 */
export const formatCnpj = (value: string | number, options?: FormatCnpjOptions): string => {
	const optionsVersion = options?.version ?? -1;
	const optionsObfuscate = options?.obfuscate ?? false;
	const optionsPad = options?.pad ?? false;
	if (value === null || value === undefined) {
		return "";
	}
	const text = asString(value);
	let cleaned = keepClass(class0, text);
	if ((optionsVersion === 2)) {
		cleaned = keepClass(class1, text).toUpperCase();
	}
	let pattern = PATTERN;
	if (isTruthy(optionsObfuscate)) {
		pattern = OBFUSCATED_PATTERN;
	}
	return layout(cleaned, pattern, isTruthy(optionsPad));
};

/**
 * Lays a value over a pattern.
 *
 * @param {string} value - The sanitized value.
 * @param {string} pattern - The mask.
 * @param {boolean} pad - Whether to left pad the value with zeros up to the number of slots.
 * @returns {string} The masked value, cut short where the value runs out.
 */
const layout = (value: string, pattern: string, pad: boolean): string => {
	let slots = 0;
	for (let index = 0; index < pattern.length; index++) {
		if (((codeAt(pattern, index) === 48) || (codeAt(pattern, index) === 42))) {
			slots = (slots + 1);
		}
	}
	let padded = value;
	if (pad) {
		padded = padStart(value, slots, "0");
	}
	let formatted = "";
	let cursor = 0;
	for (let index = 0; index < pattern.length; index++) {
		const slot = codeAt(pattern, index);
		if (((slot === 48) || (slot === 42))) {
			if ((cursor >= padded.length)) {
				return formatted;
			}
			if ((slot === 42)) {
				formatted = (formatted + "*");
			} else {
				formatted = (formatted + padded.slice(cursor, (cursor + 1)));
			}
			cursor = (cursor + 1);
		} else {
			if ((cursor < padded.length)) {
				formatted = (formatted + pattern.slice(index, (index + 1)));
			}
		}
	}
	return formatted;
};
