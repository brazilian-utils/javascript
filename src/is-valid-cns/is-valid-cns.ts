import {
	CNS_DEFINITIVE_ADJUSTED_SUFFIX,
	CNS_DEFINITIVE_BASE_LENGTH,
	CNS_DEFINITIVE_SUFFIX,
	CNS_FORMAT_REGEX,
} from "../_internals/constants/cns";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const DEFINITIVE_FIRST_DIGIT_REGEX = /^[12]/;
const PROVISIONAL_FIRST_DIGIT_REGEX = /^[789]/;

const isValidDefinitive = (digits: string): boolean => {
	const base = digits.slice(0, CNS_DEFINITIVE_BASE_LENGTH);
	const sum = generateChecksum({ base, weight: 15 });
	const rawCheckDigit = 11 - (sum % 11);

	if (rawCheckDigit === 10) {
		const checkDigit = 11 - ((sum + 2) % 11);

		return digits === `${base}${CNS_DEFINITIVE_ADJUSTED_SUFFIX}${checkDigit}`;
	}

	const checkDigit = rawCheckDigit === 11 ? 0 : rawCheckDigit;

	return digits === `${base}${CNS_DEFINITIVE_SUFFIX}${checkDigit}`;
};

const isValidProvisional = (digits: string): boolean =>
	generateChecksum({ base: digits, weight: 15 }) % 11 === 0;

/**
 * Validates a CNS (Cartão Nacional de Saúde) number, the unique identifier of a SUS
 * (Sistema Único de Saúde) user, health professional or health facility.
 *
 * Definitive cards (starting with 1 or 2) are laid out as an 11 digit PIS/PASEP/NIS derived
 * base, a 3 digit suffix and a check digit. The check digit is 11 minus the remainder of the
 * base's weighted sum (weights 15 down to 5) divided by 11, with 11 mapped to 0. When that
 * raw digit is 10, DATASUS raises the weighted sum by 2, recomputes the digit and marks the
 * card with the suffix `"001"` instead of `"000"`. Provisional cards (starting with 7, 8 or 9)
 * are validated by a single weighted sum (weights 15 down to 1 over all 15 digits) that must
 * be a multiple of 11.
 *
 * The value has to be written as the 15 digits, optionally split into the printed groups of 3,
 * 4, 4 and 4 by whitespace, `.`, `-` or `/`, the interchangeable mask characters `isValidCpf`
 * and `isValidCnpj` accept, a run of them between two groups included; anything else, a letter
 * among the digits or a separator inside a group included, is rejected instead of being read
 * past.
 *
 * A number is only read as a CNS when it is a non-negative safe integer.
 *
 * @param {string|number} value - The CNS value to be validated.
 * @returns {boolean} True if the CNS is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCns("123456789010000"); // true (definitive, suffix 000)
 * isValidCns("100000000060018"); // true (definitive, raw check digit 10, suffix 001)
 * isValidCns("700000000000005"); // true (provisional)
 * isValidCns("123.4567-8901/0000"); // true (any of the mask characters)
 * isValidCns("123456789010001"); // false (wrong check digit)
 * isValidCns("12345678901"); // false (wrong length)
 * isValidCns(13945721823.0006); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 * ANVISA's two validation routines, the ones implemented here. The page sits behind a bot filter
 * and answers HTTP 403 to every non-browser client, so it has to be opened in a browser.
 * @see Based on: https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html
 * e-SUS APS documentation of the same DATASUS algorithm, reachable without a browser. It applies
 * the provisional routine to numbers starting with 5, 7, 8 or 9; this implementation follows the
 * ANVISA page, which restricts it to 7, 8 and 9, so a 5 prefixed number is rejected even when its
 * weighted sum checks out.
 */
export const isValidCns = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const digits = sanitizeToDigits(value);

	if (!CNS_FORMAT_REGEX.test(String(value).trim())) return false;

	if (DEFINITIVE_FIRST_DIGIT_REGEX.test(digits)) return isValidDefinitive(digits);

	if (PROVISIONAL_FIRST_DIGIT_REGEX.test(digits)) return isValidProvisional(digits);

	return false;
};
