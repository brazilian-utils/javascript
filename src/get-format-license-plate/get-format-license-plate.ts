import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { LENGTH } from "../parse-license-plate/constants";
import { parseLicensePlate } from "../parse-license-plate/parse-license-plate";
import { MERCOSUL_REGEX, OLD_FORMAT_REGEX } from "./constants";

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
 * any supported format.
 *
 * @example
 * ```typescript
 * getFormatLicensePlate("ABC1234"); // "LLLNNNN"
 * getFormatLicensePlate("ABC1D23"); // "LLLNLNN"
 * getFormatLicensePlate("ABC12D3"); // null (not a Mercosul sequence)
 * getFormatLicensePlate("ABC1234EXTRA"); // null (too many characters)
 * ```
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 */
export const getFormatLicensePlate = (value: string): LicensePlateFormat | null => {
	if (typeof value !== "string") return null;

	if (sanitizeToAlphanumeric(value).length !== LENGTH) return null;

	const parsed = parseLicensePlate(value);

	if (OLD_FORMAT_REGEX.test(parsed)) return "LLLNNNN";
	if (MERCOSUL_REGEX.test(parsed)) return "LLLNLNN";

	return null;
};
