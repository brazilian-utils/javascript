import { calculateCnpjCheckDigit } from "../_internals/calculate-cnpj-check-digit/calculate-cnpj-check-digit";
import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../_internals/constants/cnpj";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `isValidCnpj`. */
export type IsValidCnpjOptions = {
	/** Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
};

const FORMAT_REGEX =
	/^[0-9A-Z]{2}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{4}[\s.\-/]*[0-9]{2}$/;

const NUMERIC_FORMAT_REGEX = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{2}$/;

const LETTER_REGEX = /[A-Z]/;

const isValidChecksum = (cnpj: string): boolean =>
	cnpj.charCodeAt(12) - 48 === calculateCnpjCheckDigit(cnpj, CNPJ_FIRST_DIGIT_WEIGHTS) &&
	cnpj.charCodeAt(13) - 48 === calculateCnpjCheckDigit(cnpj, CNPJ_SECOND_DIGIT_WEIGHTS);

/**
 * Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
 * Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats.
 * Accepts the usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
 *
 * @param {string} cnpj - The CNPJ value to be validated.
 * @param {IsValidCnpjOptions} [options] - Optional options.
 * @param {1|2} [options.version] - `1` validates the numeric-only format (the default),
 * `2` validates both the numeric and the alphanumeric formats. Any other value is read as `1`,
 * as `formatCnpj` and `parseCnpj` do.
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
 * Version 2 has no reserved-value list because the Receita Federal manual defines none for the
 * alphanumeric format, so a repeated-character alphanumeric base (e.g. all `A`s) that passes the
 * checksum is accepted, unlike the numeric reserved numbers rejected under version 1.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const isValidCnpj = (cnpj: string, options?: IsValidCnpjOptions): boolean => {
	if (typeof cnpj !== "string") return false;

	const trimmed = cnpj.trim();

	if (options?.version === 2) {
		const cleaned = sanitizeToAlphanumeric(cnpj);

		if (LETTER_REGEX.test(cleaned)) {
			return FORMAT_REGEX.test(trimmed.toUpperCase()) && isValidChecksum(cleaned);
		}
	}

	const numeric = sanitizeToDigits(cnpj);

	return (
		NUMERIC_FORMAT_REGEX.test(trimmed) && !isRepeatedDigits(numeric) && isValidChecksum(numeric)
	);
};
