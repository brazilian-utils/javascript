import { calculateProcessoJuridicoCheckDigits } from "../_internals/calculate-processo-juridico-check-digits/calculate-processo-juridico-check-digits";
import { getProcessoJuridicoTribunals } from "../_internals/constants/processo-juridico";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { pickRandom } from "../_internals/pick-random/pick-random";

/** The parameters of `generateProcessoJuridico`. */
export type GenerateProcessoJuridicoParams = {
	/** Filing year, from the current year to 9999 (default: the current year). */
	year?: number;
	/** Court segment (J), from 1 to 9 (default: random). */
	court?: number;
};

/**
 * The parameters of `generateProcessoJuridico`, the 2.3.0 name of
 * `GenerateProcessoJuridicoParams`.
 *
 * @deprecated Use `GenerateProcessoJuridicoParams` instead.
 */
export type GenerateProcessoJuridicoOptions = GenerateProcessoJuridicoParams;

const MAX_YEAR = 9999;
const TRIBUNAL_LENGTH = 2;

/**
 * Generates a random valid Brazilian Processo Jurídico (court case) number,
 * following the `NNNNNNNDDAAAAJTROOOO` layout of Resolução CNJ nº 65/2008.
 *
 * The órgão (`J`) and the tribunal (`TR`) are drawn from the closed lists of art. 1º, § 4º and
 * § 5º of the resolution, so the pair always names a court that exists: `court` picks the órgão
 * and the `TR` is then drawn among the tribunais that órgão has, which is why a `court` outside
 * 1 to 9, the only value with no tribunal to draw from, returns `null` instead of a number. The
 * unidade de origem (`OOOO`) is drawn freely, since art. 1º, § 6º leaves its codification to each
 * tribunal and publishes no central list.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {GenerateProcessoJuridicoParams} [options] - Optional generation options.
 * @param {number} options.year - The `AAAA` field. Must be an integer between the
 * current year and 9999. Defaults to the current year.
 * @param {number} options.court - The `J` field (segmento do Judiciário). Must be an
 * integer between 1 and 9. Defaults to a random value.
 * @returns {string|null} The generated number without formatting, or null when the options are invalid.
 *
 * @example
 * ```typescript
 * generateProcessoJuridico(); // "00020803420265150049"
 * generateProcessoJuridico({ year: 2030, court: 5 }); // "12345679820305120049"
 * generateProcessoJuridico({ year: 10000 }); // null
 * generateProcessoJuridico({ court: 10 }); // null (no such órgão)
 * ```
 *
 * Resolução CNJ nº 65/2008 defines this Número Único de Processo layout and its check digits, and
 * closes the list of órgão (`J`) and tribunal (`TR`) codes in art. 1º, § 4º and § 5º.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export const generateProcessoJuridico = (
	options: GenerateProcessoJuridicoParams = {},
): string | null => {
	if (isNullish(options) || typeof options !== "object") return null;

	const currentYear = new Date().getFullYear();
	const tribunalsByCourt = getProcessoJuridicoTribunals();
	const { year = currentYear, court = pickRandom([...tribunalsByCourt.keys()]) } = options;
	const tribunals = tribunalsByCourt.get(court);

	if (!Number.isInteger(year) || year < currentYear || year > MAX_YEAR || tribunals === undefined) {
		return null;
	}

	const sequencial = generateRandomNumber(7);
	const tribunal = String(pickRandom(tribunals)).padStart(TRIBUNAL_LENGTH, "0");
	const foro = generateRandomNumber(4);
	const base = `${sequencial}${year}${court}${tribunal}${foro}`;
	const checkDigits = String(calculateProcessoJuridicoCheckDigits(base)).padStart(2, "0");

	return `${sequencial}${checkDigits}${year}${court}${tribunal}${foro}`;
};
