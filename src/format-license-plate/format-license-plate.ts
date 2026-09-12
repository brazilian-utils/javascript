import { parseLicensePlate } from "../parse-license-plate/parse-license-plate";
import { OLD_FORMAT_SEPARATOR_INDEX } from "./constants";

/**
 * Formats a Brazilian license plate (placa de carro ou moto).
 *
 * Old format plates ("LLLNNNN") are hyphenated, while Mercosul plates ("LLLNLNN") are
 * returned without any separator. Partial values are formatted as far as they go, so the
 * function can be used as an input mask.
 *
 * @param {string} value - The license plate to be formatted.
 * @returns {string} The formatted license plate, or an empty string when the value cannot
 * start a valid license plate.
 *
 * @example
 * ```typescript
 * formatLicensePlate("abc1234"); // "ABC-1234"
 * formatLicensePlate("abc1d23"); // "ABC1D23"
 * formatLicensePlate("1234567"); // ""
 * ```
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 */
export const formatLicensePlate = (value: string): string => {
	const parsed = parseLicensePlate(value);

	if (!/^[A-Z]{1,3}$/.test(parsed.slice(0, Math.min(parsed.length, OLD_FORMAT_SEPARATOR_INDEX)))) {
		return "";
	}

	if (parsed.length <= OLD_FORMAT_SEPARATOR_INDEX) return parsed;

	const tail = parsed.slice(OLD_FORMAT_SEPARATOR_INDEX);

	if (/^\d{1,4}$/.test(tail)) {
		return `${parsed.slice(0, OLD_FORMAT_SEPARATOR_INDEX)}-${tail}`;
	}

	if (/^\d[A-Z]\d{0,2}$/.test(tail)) {
		return parsed;
	}

	return "";
};
