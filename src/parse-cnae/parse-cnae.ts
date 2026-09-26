import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNAE (Classificação Nacional de Atividades Econômicas) formatting characters and
 * returns only digits.
 *
 * A complete subclass code has 7 digits, which is the length the result is capped at; a shorter
 * value (a division, a group or a class still being typed) passes through as far as it goes and
 * is never left padded, so the leading zeros a code carries have to be written out. Use
 * `getCnae` or `isValidCnae`, which do pad a bare numeric code, to look a code up.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNAE code to be parsed.
 * @returns {string} Up to 7 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCnae("6201-5/01"); // "6201501"
 * parseCnae(620150.1); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 */
export const parseCnae = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
