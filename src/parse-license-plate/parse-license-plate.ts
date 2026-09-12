import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { LENGTH } from "./constants";

/**
 * Removes license plate formatting characters and returns only uppercase alphanumerics.
 *
 * @param {string} value - The license plate to be parsed.
 * @returns {string} Up to 7 uppercase alphanumeric characters, or an empty string when the
 * value is not a string.
 *
 * @example
 * ```typescript
 * parseLicensePlate("abc-1234"); // "ABC1234"
 * ```
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 */
export const parseLicensePlate = (value: string): string => {
	if (typeof value !== "string") return "";
	return sanitizeToAlphanumeric(value).slice(0, LENGTH);
};
