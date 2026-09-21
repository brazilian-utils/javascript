/**
 * CNPJ, written once.
 *
 * This is ordinary TypeScript inside the portable subset the bridge accepts: annotated
 * parameters and returns, regex literals it compiles rather than passes through, and the same
 * boundary guards the handwritten package has. `spec/bridge/README.md` documents the subset;
 * the compiler rejects anything outside it instead of guessing.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
import { asString, isTruthy } from "./_std.ts";

/** Options of `isValidCnpj`. */
export type IsValidCnpjOptions = {
	/** Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
};

/** Options of `formatCnpj`. */
export type FormatCnpjOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
	/** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
	/** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`). */
	obfuscate?: boolean;
};

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const PATTERN = "00.000.000/0000-00";
const OBFUSCATED_PATTERN = "**.000.000/0000-**";

const ALPHANUMERIC_FORMAT =
	/^[0-9A-Z]{2}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{4}[\s.\-/]*[0-9]{2}$/;
const NUMERIC_FORMAT = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{2}$/;
const LETTER = /[A-Z]/;
const NON_ALPHANUMERIC = /[^A-Za-z0-9]/g;
const NON_DIGIT = /\D/g;

/** Computes one CNPJ check digit from the base and its weight vector. */
const checkDigit = (base: string, weights: number[]): number => {
	let sum = 0;

	for (let index = 0; index < weights.length; index++) {
		sum = sum + (base.charCodeAt(index) - 48) * weights[index];
	}

	const remainder = sum % 11;

	if (remainder < 2) {
		return 0;
	}

	return 11 - remainder;
};

/** Whether both check digits of a sanitized 14 character CNPJ match its base. */
const hasValidChecksum = (cnpj: string): boolean => {
	if (cnpj.charCodeAt(12) - 48 !== checkDigit(cnpj, FIRST_DIGIT_WEIGHTS)) {
		return false;
	}

	return cnpj.charCodeAt(13) - 48 === checkDigit(cnpj, SECOND_DIGIT_WEIGHTS);
};

/** Whether every character of the value is the same one. */
const isRepeated = (value: string): boolean => {
	if (value.length === 0) {
		return false;
	}

	for (let index = 1; index < value.length; index++) {
		if (value.charCodeAt(index) !== value.charCodeAt(0)) {
			return false;
		}
	}

	return true;
};

/** Lays a value over a pattern: `0` copies a character, `*` hides one, anything else separates. */
const layout = (value: string, pattern: string, pad: boolean): string => {
	let slots = 0;

	for (let index = 0; index < pattern.length; index++) {
		if (pattern.charCodeAt(index) === 48 || pattern.charCodeAt(index) === 42) {
			slots = slots + 1;
		}
	}

	let padded = value;

	if (pad) {
		padded = value.padStart(slots, "0");
	}

	let formatted = "";
	let cursor = 0;

	for (let index = 0; index < pattern.length; index++) {
		const slot = pattern.charCodeAt(index);

		if (slot === 48 || slot === 42) {
			if (cursor >= padded.length) {
				return formatted;
			}

			if (slot === 42) {
				formatted = formatted + "*";
			} else {
				formatted = formatted + padded.slice(cursor, cursor + 1);
			}

			cursor = cursor + 1;
		} else if (cursor < padded.length) {
			formatted = formatted + pattern.slice(index, index + 1);
		}
	}

	return formatted;
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
	if (typeof cnpj !== "string") {
		return false;
	}

	const trimmed = cnpj.trim();

	if (options?.version === 2) {
		const cleaned = cnpj.replaceAll(NON_ALPHANUMERIC, "").toUpperCase();

		if (LETTER.test(cleaned)) {
			if (!ALPHANUMERIC_FORMAT.test(trimmed.toUpperCase())) {
				return false;
			}

			return hasValidChecksum(cleaned);
		}
	}

	const numeric = cnpj.replaceAll(NON_DIGIT, "");

	if (!NUMERIC_FORMAT.test(trimmed)) {
		return false;
	}

	if (isRepeated(numeric)) {
		return false;
	}

	return hasValidChecksum(numeric);
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
	if (value === null || value === undefined) {
		return "";
	}

	const text = asString(value);

	let cleaned = text.replaceAll(NON_DIGIT, "");

	if (options?.version === 2) {
		cleaned = text.replaceAll(NON_ALPHANUMERIC, "").toUpperCase();
	}

	let pattern = PATTERN;

	if (isTruthy(options?.obfuscate)) {
		pattern = OBFUSCATED_PATTERN;
	}

	return layout(cleaned, pattern, isTruthy(options?.pad));
};
