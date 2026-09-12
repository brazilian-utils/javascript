import {
	CNS_DEFINITIVE_ADJUSTED_SUFFIX,
	CNS_DEFINITIVE_BASE_LENGTH,
	CNS_DEFINITIVE_SUFFIX,
	CNS_LENGTH,
} from "../_internals/constants/cns";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
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
 * @param {string|number} value - The CNS value to be validated.
 * @returns {boolean} True if the CNS is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCns("123456789010000"); // true (definitive, suffix 000)
 * isValidCns("100000000060018"); // true (definitive, raw check digit 10, suffix 001)
 * isValidCns("700000000000005"); // true (provisional)
 * isValidCns("123456789010001"); // false (wrong check digit)
 * isValidCns("12345678901"); // false (wrong length)
 * ```
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 */
export const isValidCns = (value: string | number): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== CNS_LENGTH) return false;

	if (DEFINITIVE_FIRST_DIGIT_REGEX.test(digits)) return isValidDefinitive(digits);

	if (PROVISIONAL_FIRST_DIGIT_REGEX.test(digits)) return isValidProvisional(digits);

	return false;
};
