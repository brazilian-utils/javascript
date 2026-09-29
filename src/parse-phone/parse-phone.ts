import { PHONE_NATIONAL_MAX_LENGTH } from "../_internals/constants/phone";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";

/**
 * Removes phone formatting characters, returns only digits, and caps the result to 11 digits.
 *
 * A Brazilian country code is stripped first. An explicit one, written as `+55` or `0055` at
 * the start of the value, is always removed, so a number still being typed keeps its DDD:
 * `"+55 11 9"` gives `"119"`. A bare leading `55` is removed **only when** the digits left
 * behind are exactly 10 or 11 long, i.e. a plausible national number (DDD plus an 8 or 9 digit
 * subscriber number), so a number from the `55` area code survives: `"55987654321"` would leave
 * only 9 digits, so its `55` is read as the DDD. Up to 2.4.0 the length rule applied to the
 * explicit forms too, so `"+55 11 9"` gave `"55119"`. Written with a full number, `"+5511987654321"`,
 * `"005511987654321"` and `"5511987654321"` all parse alike.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The phone value to be parsed.
 * @returns {string} The phone value without formatting.
 *
 * @example
 * ```typescript
 * parsePhone("(11) 98765-4321"); // "11987654321"
 * parsePhone("+55 (11) 98765-4321"); // "11987654321"
 * parsePhone("5511987654321"); // "11987654321"
 * parsePhone("+55 11 9"); // "119"
 * parsePhone("55987654321"); // "55987654321" (area code 55, country code kept out of it)
 * parsePhone(-11987654321); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.itu.int/rec/T-REC-E.164
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const parsePhone = (value: string | number): string =>
	isLookupCode(value) ? normalizePhone(value).slice(0, PHONE_NATIONAL_MAX_LENGTH) : "";
