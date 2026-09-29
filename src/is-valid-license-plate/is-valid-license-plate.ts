import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import {
	MASKED_PLATE_REGEX,
	MERCOSUL_REGEX,
	OLD_FORMAT_REGEX,
	type LicensePlateFormat,
} from "./constants";

export type { LicensePlateFormat } from "./constants";

/** Options for `isValidLicensePlate`. */
export type IsValidLicensePlateOptions = {
	/** The one format the plate must follow, `"LLLNNNN"` or `"LLLNLNN"`; omit it to accept both. */
	format?: LicensePlateFormat;
};

/**
 * Validates if a Brazilian license plate (placa de carro ou moto) is valid.
 *
 * Supports the old Brazilian format (ABC-1234) and the Mercosul format (ABC1D23), the single
 * sequence Resolução CONTRAN nº 969/2022 defines for every vehicle, motorcycles included.
 * Accepts the usual mask characters (whitespace, `.`, `-` or `/`, alone or in a run) between the
 * third character and the last four, and is case-insensitive. A mask character anywhere else, or
 * any other character (`"A@BC1234"`, an emoji), makes the plate invalid instead of being
 * stripped. The two formats checked here are the ones `getFormatLicensePlate` names, and it
 * returns `null` exactly when this returns false.
 *
 * `options.format` restricts the check to one of them, `"LLLNNNN"` or `"LLLNLNN"`, as the
 * `type` argument of the Python library's `is_valid` does with its own names, `"old_format"` and
 * `"mercosul"`. Those Python names are not formats here: without `format`, or with any other
 * value, a plate in either format is valid.
 *
 * The resolution's own text does not spell the sequence out: art. 2º § 2º delegates the
 * technical specification to Anexo I, whose item 1.2 reads "O padrão de estampagem é composto de
 * 7 (sete) caracteres alfanuméricos, em alto relevo, na sequência LLLNLNN" and whose item 1.2.1
 * reads `L` as a letter and `N` as a numeral. Art. 2º § 1º puts a single rear plate of that same
 * standard on motorcycles and similar vehicles, and art. 2º § 3º describes the old `AAA-1111`
 * PNU it coexists with. The annexes are published in a PDF of their own, cited below alongside
 * the resolution's text.
 *
 * @param {string} value - The license plate value to be validated.
 * @param {IsValidLicensePlateOptions} [options] - The validation options.
 * @param {LicensePlateFormat} [options.format] - The one format to accept, `"LLLNNNN"` (old) or
 * `"LLLNLNN"` (Mercosul).
 * @returns {boolean} True if the license plate is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLicensePlate("abc1234"); // true (Brazilian format)
 * isValidLicensePlate("ABC-1234"); // true (Brazilian format with hyphen)
 * isValidLicensePlate("ABC 1234"); // true (whitespace mask)
 * isValidLicensePlate("abc1d23"); // true (Mercosul format)
 * isValidLicensePlate("ABC12D3"); // false (not a Mercosul sequence)
 * isValidLicensePlate("ABC1D23", { format: "LLLNLNN" }); // true
 * isValidLicensePlate("ABC1234", { format: "LLLNLNN" }); // false (an old format plate)
 * isValidLicensePlate("ABC-1234", { format: "LLLNNNN" }); // true
 * isValidLicensePlate("ABC1234EXTRA"); // false (too many characters)
 * isValidLicensePlate("A-BC1234"); // false (the mask sits after the third character only)
 * isValidLicensePlate("ABC1234!"); // false (any other character is rejected)
 * isValidLicensePlate("invalid"); // false
 * ```
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf
 */
export const isValidLicensePlate = (
	value: string,
	options?: IsValidLicensePlateOptions,
): boolean => {
	if (typeof value !== "string" || !MASKED_PLATE_REGEX.test(value)) return false;

	const parsed = sanitizeToAlphanumeric(value);
	const format = options?.format;

	return (
		(format !== "LLLNLNN" && OLD_FORMAT_REGEX.test(parsed)) ||
		(format !== "LLLNNNN" && MERCOSUL_REGEX.test(parsed))
	);
};
