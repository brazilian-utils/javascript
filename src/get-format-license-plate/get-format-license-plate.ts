import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { OLD_FORMAT_REGEX } from "../is-valid-license-plate/constants";
import { isValidLicensePlate } from "../is-valid-license-plate/is-valid-license-plate";

/** The Brazilian license plate formats `getFormatLicensePlate` can identify: the old `LLLNNNN` and the Mercosul `LLLNLNN`. */
export type LicensePlateFormat = "LLLNNNN" | "LLLNLNN";

/**
 * Identifies the format of a Brazilian license plate (placa de carro ou moto).
 *
 * Two formats are supported: the old Brazilian `LLLNNNN` and the single Mercosul sequence
 * `LLLNLNN` that Resolução CONTRAN nº 969/2022 defines for every vehicle, motorcycles
 * included.
 *
 * Returns `null` when the sanitized value does not have exactly 7 alphanumeric characters
 * (e.g. it is too short, too long, or otherwise malformed) or does not match any of the
 * supported formats.
 *
 * @param {string} value - The license plate value to be checked.
 * @returns {LicensePlateFormat | null} The identified format, or `null` when it doesn't match
 * any supported format, which is exactly when `isValidLicensePlate` returns false.
 *
 * @example
 * ```typescript
 * getFormatLicensePlate("ABC1234"); // "LLLNNNN"
 * getFormatLicensePlate("ABC1D23"); // "LLLNLNN"
 * getFormatLicensePlate("ABC12D3"); // null (not a Mercosul sequence)
 * getFormatLicensePlate("ABC1234EXTRA"); // null (too many characters)
 * ```
 *
 * The resolution's own text does not spell the sequence out: art. 2º § 2º delegates the
 * technical specification to Anexo I, whose item 1.2 reads "O padrão de estampagem é composto de
 * 7 (sete) caracteres alfanuméricos, em alto relevo, na sequência LLLNLNN" and whose item 1.2.1
 * reads `L` as a letter and `N` as a numeral. Art. 2º § 1º puts a single rear plate of that same
 * standard on motorcycles and similar vehicles, and art. 2º § 3º describes the old `AAA-1111`
 * PNU it coexists with. The annexes are published in a PDF of their own, cited below alongside
 * the resolution's text.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf
 */
export const getFormatLicensePlate = (value: string): LicensePlateFormat | null => {
	if (!isValidLicensePlate(value)) return null;

	return OLD_FORMAT_REGEX.test(sanitizeToAlphanumeric(value)) ? "LLLNNNN" : "LLLNLNN";
};
