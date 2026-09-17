import { isNullish } from "../_internals/is-nullish/is-nullish";
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
 * @param {string|number} value - The NCM code to be parsed.
 * @returns {string} Up to 8 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNcm("8471.30.12"); // "84713012"
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const parseNcm = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
