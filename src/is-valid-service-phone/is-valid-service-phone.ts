import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
	SERVICE_PHONE_UTILITY_CODES,
	SERVICE_PHONE_UTILITY_LENGTH,
} from "../_internals/constants/service-phone";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const NON_GEOGRAPHIC_PREFIXES: readonly string[] = SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES;

const ABBREVIATED_ROOTS: readonly string[] = SERVICE_PHONE_ABBREVIATED_ROOTS;

const UTILITY_CODES: readonly string[] = SERVICE_PHONE_UTILITY_CODES;

/**
 * Validates if a phone number is a valid Brazilian service number.
 *
 * Service numbers are dialed without a DDD, so they are validated by prefix and length alone:
 * - the Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900`, each followed by
 *   7 digits (11 in total, the shorter, extinct `0800` + 6 form is rejected);
 * - the abbreviated `300X` and `400X` numbers, followed by 4 digits, e.g. `3003-1234`. Anatel
 *   publishes no allocation for these, so the accepted roots are the conventional ones;
 * - the 3-digit Códigos de Acesso a Serviços de Utilidade Pública that Anatel has designated,
 *   e.g. `190` and `192`. Undesignated codes in the `1XX` range are rejected.
 *
 * Only the structure is checked: the number does not have to be assigned to anyone, and the
 * `0500` rule that encodes a donation amount in the last two digits is not enforced.
 *
 * @param {string} value - The phone number to validate.
 * @returns {boolean} True if the phone number is a valid service phone, false otherwise.
 *
 * @example
 * ```typescript
 * isValidServicePhone("0800 123 4567"); // true
 * isValidServicePhone("4004-1234"); // true
 * isValidServicePhone("190"); // true
 * isValidServicePhone("11987654321"); // false (geographic number)
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const isValidServicePhone = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length === SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH) {
		return NON_GEOGRAPHIC_PREFIXES.includes(
			digits.slice(0, SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH),
		);
	}

	if (digits.length === SERVICE_PHONE_ABBREVIATED_LENGTH) {
		return ABBREVIATED_ROOTS.includes(digits.slice(0, SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH));
	}

	// Stryker disable next-line ConditionalExpression: UTILITY_CODES.includes(digits) only ever matches an exact 3 character code, so a digits value of any other length already correctly fails this check on its own
	if (digits.length === SERVICE_PHONE_UTILITY_LENGTH) {
		return UTILITY_CODES.includes(digits);
	}

	return false;
};
