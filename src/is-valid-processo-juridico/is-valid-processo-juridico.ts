import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	CHECK_DIGIT_LENGTH,
	CHECK_DIGIT_START_POSITION,
	MOD_97_10_QUOTIENT,
	MOD_97_10_SUM,
} from "./constants";

const verifyCheckDigit = (value: string): boolean => {
	const verificationDigits = Number.parseInt(
		value.substring(CHECK_DIGIT_START_POSITION, CHECK_DIGIT_START_POSITION + CHECK_DIGIT_LENGTH),
		10,
	);

	const withoutCheck =
		value.substring(0, CHECK_DIGIT_START_POSITION) +
		value.substring(CHECK_DIGIT_START_POSITION + CHECK_DIGIT_LENGTH);

	let digits1to11 = 0;
	for (let i = 0; i < 11; i++) {
		digits1to11 += (withoutCheck.charCodeAt(i) - 48) * 10 ** (10 - i);
	}
	const firstRemainder = digits1to11 % MOD_97_10_QUOTIENT;

	let digits12to18 = 0;
	for (let i = 11; i < 18; i++) {
		digits12to18 += (withoutCheck.charCodeAt(i) - 48) * 10 ** (6 - (i - 11));
	}

	const secondRemainder =
		(firstRemainder * 1_000_000_000 + digits12to18 * 100) % MOD_97_10_QUOTIENT;

	const verifier = MOD_97_10_SUM - secondRemainder;

	return verifier === verificationDigits;
};

/**
 * Validates a Brazilian Processo Jurídico (court case) number.
 *
 * @param {string} value - The Processo Jurídico number to validate.
 * @returns {boolean} True if the Processo Jurídico number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidProcessoJuridico("00020802520125150049"); // true
 * isValidProcessoJuridico("0002080-25.2012.5.15.0049"); // true
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119 Resolução CNJ nº 65/2008
 */
export const isValidProcessoJuridico = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== PROCESSO_JURIDICO_LENGTH) return false;

	return verifyCheckDigit(digits);
};
