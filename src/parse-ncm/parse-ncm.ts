import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes NCM (Nomenclatura Comum do Mercosul) formatting characters and returns only digits.
 *
 * A complete code has 8 digits, which is the length the result is capped at; a shorter value (a
 * position or a subposition, or a code still being typed) passes through as far as it goes and is
 * never left padded, so the leading zeros a code carries have to be written out. Use `isValidNcm`,
 * which does pad a bare numeric code, to check a code against the official table.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The NCM code to be parsed.
 * @returns {string} Up to 8 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNcm("8471.30.12"); // "84713012"
 * parseNcm(8471301.2); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const parseNcm = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
