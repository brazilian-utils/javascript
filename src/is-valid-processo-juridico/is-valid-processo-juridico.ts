import { calculateProcessoJuridicoCheckDigits } from "../_internals/calculate-processo-juridico-check-digits/calculate-processo-juridico-check-digits";
import { PROCESSO_JURIDICO_TRIBUNALS } from "../_internals/constants/processo-juridico";
import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import {
	CHECK_DIGIT_LENGTH,
	CHECK_DIGIT_START_POSITION,
	COURT_POSITION,
	TRIBUNAL_LENGTH,
	TRIBUNAL_START_POSITION,
} from "./constants";

const FORMAT_REGEX = /^\d{7}[\s.-]*\d{2}[\s.-]*\d{4}[\s.-]*\d[\s.-]*\d{2}[\s.-]*\d{4}$/;

const verifyCheckDigit = (value: string): boolean => {
	const verificationDigits = Number.parseInt(
		value.slice(CHECK_DIGIT_START_POSITION, CHECK_DIGIT_START_POSITION + CHECK_DIGIT_LENGTH),
		10,
	);

	const withoutCheck =
		value.slice(0, CHECK_DIGIT_START_POSITION) +
		value.slice(CHECK_DIGIT_START_POSITION + CHECK_DIGIT_LENGTH);

	return calculateProcessoJuridicoCheckDigits(withoutCheck) === verificationDigits;
};

const verifyCourtAndTribunal = (value: string): boolean => {
	const tribunals = PROCESSO_JURIDICO_TRIBUNALS.get(Number(value.charAt(COURT_POSITION)));

	if (tribunals === undefined) return false;

	return tribunals.includes(
		Number(value.slice(TRIBUNAL_START_POSITION, TRIBUNAL_START_POSITION + TRIBUNAL_LENGTH)),
	);
};

/**
 * Validates a Brazilian Processo Jurídico (court case) number.
 *
 * Three things are checked: the `NNNNNNN-DD.AAAA.J.TR.OOOO` layout, the `DD` check digits (ISO
 * 7064 MOD 97-10) and the `J` and `TR` pair, which has to name an órgão and a tribunal Resolução
 * CNJ nº 65/2008 actually created, so a number carrying a correct check digit but a court that
 * does not exist, `0000100-23.2008.8.28.0000`, is rejected. The unidade de origem (`OOOO`) is
 * only read as four digits: art. 1º, § 6º leaves its codification to each tribunal, so there is
 * no central list to check it against.
 *
 * The CNJ mask separators (whitespace, `.` and `-`) are accepted between the
 * `NNNNNNN-DD.AAAA.J.TR.OOOO` fields, and whitespace around the value is ignored, but any other
 * character, a letter in particular, makes the value invalid.
 *
 * @param {string} value - The Processo Jurídico number to validate.
 * @returns {boolean} True if the Processo Jurídico number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidProcessoJuridico("00020802520125150049"); // true
 * isValidProcessoJuridico("0002080-25.2012.5.15.0049"); // true
 * isValidProcessoJuridico(" 0002080-25.2012.5.15.0049 "); // true (surrounding whitespace)
 * isValidProcessoJuridico("0000100-23.2008.8.28.0000"); // false (there is no 28th Tribunal de Justiça)
 * isValidProcessoJuridico("ab00020802520125150049"); // false (invalid format)
 * ```
 *
 * Resolução CNJ nº 65/2008 defines this Número Único de Processo layout and its check digits, and
 * closes the list of órgão (`J`) and tribunal (`TR`) codes in art. 1º, § 4º and § 5º.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export const isValidProcessoJuridico = (value: string): boolean => {
	if (typeof value !== "string") return false;

	if (!FORMAT_REGEX.test(value.trim())) return false;

	const digits = value.replace(SEPARATORS_REGEX, "");

	if (!verifyCheckDigit(digits)) return false;

	return verifyCourtAndTribunal(digits);
};
