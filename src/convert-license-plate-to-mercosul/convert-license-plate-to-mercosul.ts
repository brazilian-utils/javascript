import { getFormatLicensePlate } from "../get-format-license-plate/get-format-license-plate";
import { parseLicensePlate } from "../parse-license-plate/parse-license-plate";
import { DIGIT_TO_MERCOSUL_LETTER } from "./constants";

/**
 * Converts an old format Brazilian license plate ("LLLNNNN") to the Mercosul format
 * ("LLLNLNN"), following the official conversion table: the digit in the 5th position (the
 * 2nd digit of the 4 digit number) becomes a letter, `0` through `9` mapping to `A` through
 * `J`, and every other character is kept as is.
 *
 * @param {string} value - The old format license plate to be converted.
 * @returns {string} The converted Mercosul format plate, or `""` when `value` is not a valid
 * old format ("LLLNNNN") license plate.
 *
 * @example
 * ```typescript
 * convertLicensePlateToMercosul("ABC1234"); // "ABC1C34"
 * convertLicensePlateToMercosul("abc-1234"); // "ABC1C34"
 * convertLicensePlateToMercosul("ABC1D23"); // "" (already Mercosul)
 * convertLicensePlateToMercosul("invalid"); // ""
 * ```
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * Resolução CONTRAN nº 969/2022, art. 2º § 4º and Anexo II.
 */
export const convertLicensePlateToMercosul = (value: string): string => {
	if (getFormatLicensePlate(value) !== "LLLNNNN") return "";

	const parsed = parseLicensePlate(value);

	const letter = DIGIT_TO_MERCOSUL_LETTER[parsed.charAt(4)];

	return `${parsed.slice(0, 4)}${letter}${parsed.slice(5)}`;
};
