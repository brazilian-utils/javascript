import { PHONE_NATIONAL_MAX_LENGTH } from "../_internals/constants/phone";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";

/**
 * Removes phone formatting characters, returns only digits, and caps the result to 11 digits.
 *
 * A Brazilian country code is stripped first, under a single rule: the leading `0055` or `55`
 * is removed **only when** the digits left behind are exactly 10 or 11 long, i.e. a plausible
 * national number (DDD plus an 8 or 9 digit subscriber number). Any other input keeps its
 * digits, so a number from the `55` area code survives: `"55987654321"` would leave only 9
 * digits, so its `55` is read as the DDD. The rule is length-based, not sign-based, which
 * makes `"+5511987654321"`, `"005511987654321"` and `"5511987654321"` all parse alike.
 *
 * @param {string|number} value - The phone value to be parsed.
 * @returns {string} The phone value without formatting.
 *
 * @example
 * ```typescript
 * parsePhone("(11) 98765-4321"); // "11987654321"
 * parsePhone("+55 (11) 98765-4321"); // "11987654321"
 * parsePhone("5511987654321"); // "11987654321"
 * parsePhone("55987654321"); // "55987654321" (area code 55, country code kept out of it)
 * ```
 *
 * @see Official: https://www.itu.int/rec/T-REC-E.164
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const parsePhone = (value: string | number): string =>
	isNullish(value) ? "" : normalizePhone(value).slice(0, PHONE_NATIONAL_MAX_LENGTH);
