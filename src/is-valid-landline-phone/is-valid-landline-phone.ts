import { PHONE_NATIONAL_MIN_LENGTH } from "../_internals/constants/phone";
import { isValidDDD } from "../_internals/is-valid-ddd/is-valid-ddd";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { LANDLINE_VALID_FIRST_NUMBERS } from "./constants";

const isValidLandlineFirstNumber = (value: string): boolean => {
	const firstDigit = value.charCodeAt(2) - 48;
	return LANDLINE_VALID_FIRST_NUMBERS.includes(firstDigit);
};

/**
 * Validates if a phone number is a valid Brazilian landline phone.
 *
 * A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before
 * validation, under the rule documented in `parsePhone`.
 *
 * The number is the DDD plus 8 digits, the first of them 2 to 6: art. 11, I, "a" of Resolução
 * Anatel nº 749/2022 destines `"2" a "6"` to the STFC (fixed line) and the SCM. From 1 March 2027
 * Resolução Anatel nº 777/2025, art. 21, narrows that to `"2" a "5"`, leaving 6 to 9 digit SCM
 * numbers; the change is scheduled, not in force, so 6 is still accepted.
 *
 * @param {string} value - The phone number to validate.
 * @returns {boolean} True if the phone number is a valid landline phone, false otherwise.
 *
 * @example
 * ```typescript
 * isValidLandlinePhone("(11) 3000-0000"); // true
 * isValidLandlinePhone("1130000000"); // true
 * isValidLandlinePhone("+55 11 3000-0000"); // true
 * isValidLandlinePhone("11987654321"); // false (mobile)
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * Resolução Anatel nº 749/2022, art. 11, I, "a".
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777
 * Resolução Anatel nº 777/2025, art. 21: the art. 11 in force on 1 March 2027.
 */
export const isValidLandlinePhone = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = normalizePhone(value);

	if (digits.length !== PHONE_NATIONAL_MIN_LENGTH) return false;

	if (!isValidDDD(digits)) return false;

	return isValidLandlineFirstNumber(digits);
};
