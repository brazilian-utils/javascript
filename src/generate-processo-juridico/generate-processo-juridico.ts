import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isNullish } from "../_internals/is-nullish/is-nullish";

/** Options of `generateProcessoJuridico`. */
export type GenerateProcessoJuridicoOptions = {
	/** Filing year, from the current year to 9999 (default: the current year). */
	year?: number;
	/** Court segment (J), from 1 to 9 (default: random). */
	court?: number;
};

const MAX_YEAR = 9999;
const MIN_COURT = 1;
const MAX_COURT = 9;

const calculateCheckDigits = (base: string): string => {
	const checksum = 98n - ((BigInt(base) * 100n) % 97n);
	return checksum.toString().padStart(2, "0");
};

/**
 * Generates a random valid Brazilian Processo Jurídico (court case) number,
 * following the `NNNNNNNDDAAAAJTROOOO` layout of Resolução CNJ nº 65/2008.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {GenerateProcessoJuridicoOptions} [options] - Optional generation options.
 * @param {number} options.year - The `AAAA` field. Must be an integer between the
 * current year and 9999. Defaults to the current year.
 * @param {number} options.court - The `J` field (segmento do Judiciário). Must be an
 * integer between 1 and 9. Defaults to a random value.
 * @returns {string|null} The generated number without formatting, or null when the options are invalid.
 *
 * @example
 * ```typescript
 * generateProcessoJuridico(); // "00020802520265150049"
 * generateProcessoJuridico({ year: 2030, court: 5 }); // "12345672820305120049"
 * generateProcessoJuridico({ year: 10000 }); // null
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119 Resolução CNJ nº 65/2008
 */
export const generateProcessoJuridico = (
	options: GenerateProcessoJuridicoOptions = {},
): string | null => {
	if (isNullish(options) || typeof options !== "object") return null;

	const { year = new Date().getFullYear(), court = Math.floor(Math.random() * 9) + 1 } = options;
	const currentYear = new Date().getFullYear();

	if (
		!Number.isInteger(year) ||
		year < currentYear ||
		year > MAX_YEAR ||
		!Number.isInteger(court) ||
		court < MIN_COURT ||
		court > MAX_COURT
	) {
		return null;
	}

	const sequencial = generateRandomNumber(7);
	const tribunal = generateRandomNumber(2);
	const foro = generateRandomNumber(4);
	const base = `${sequencial}${year}${court}${tribunal}${foro}`;
	const checkDigits = calculateCheckDigits(base);

	return `${sequencial}${checkDigits}${year}${court}${tribunal}${foro}`;
};
