import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
	SERVICE_PHONE_UTILITY_CODES,
} from "../_internals/constants/service-phone";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates if a phone number is a valid Brazilian service number.
 *
 * Service numbers are dialed without a DDD, so they are validated by prefix and length alone:
 * - the Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900`, each followed by
 *   7 digits (11 in total, the shorter, extinct `0800` + 6 form is rejected);
 * - the abbreviated `300X` and `400X` numbers, followed by 4 digits, e.g. `3003-1234`. Anatel
 *   withdrew the 4-digit codes rather than allocating them (Resolução nº 86/1998 art. 43 I and
 *   Ato nº 43.151/2004 art. 2º II both ordered them released), so the accepted roots are the
 *   conventional ones the market settled on. Only `300X` and `400X` are recognised: other
 *   "Número Único" carrier prefixes in market use, such as `4020` and `4062`, are out of scope
 *   and are rejected;
 * - the 3-digit Códigos de Acesso a Serviços de Utilidade Pública that Anatel has designated,
 *   e.g. `190` and `192`, the consolidated table being the Anexo of Ato nº 43.151/2004.
 *   Undesignated codes in the `1XX` range are rejected, and so are `112` and `911`: Anatel
 *   designates neither, and `911` is not even inside the `1N₂N₁` range Resolução nº 749/2022
 *   art. 13 destines to public utility services. Handsets route both by GSM convention, which
 *   is not a numbering designation.
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
 * Resolução Anatel nº 749/2022, arts. 13, 14, 18 and 28.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151
 * Ato Anatel nº 43.151/2004, whose Anexo designates the 3-digit public utility codes.
 */
export const isValidServicePhone = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length === SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH) {
		return SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES.includes(
			digits.slice(0, SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH),
		);
	}

	if (digits.length === SERVICE_PHONE_ABBREVIATED_LENGTH) {
		return SERVICE_PHONE_ABBREVIATED_ROOTS.includes(
			digits.slice(0, SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH),
		);
	}

	// Every public utility code is exactly 3 digits, so a value of any other length that reaches
	// here matches none of them and is turned down by this very check.
	return SERVICE_PHONE_UTILITY_CODES.includes(digits);
};
