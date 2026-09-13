import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { NCM_CODES, NCM_FORMAT_REGEX } from "./constants";

let cache: Set<string> | undefined;

const getCache = (): Set<string> => {
	cache ??= new Set(NCM_CODES);
	return cache;
};

/**
 * Validates if a NCM (Nomenclatura Comum do Mercosul) code exists in the official table.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 8
 * digits, or the `NNNN.NN.NN` mask, with a single separator between the groups and optional
 * surrounding whitespace. Anything else (`"abc01012100"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
 *
 * A bare `number` input cannot represent a code that starts with `0` (the leading zero is
 * lost), so a numeric NCM code starting with `0` must be passed as a string to validate
 * correctly.
 *
 * @param {string|number} value - The NCM code to be validated, with or without the
 * `NNNN.NN.NN` mask.
 * @returns {boolean} True when the code is a known 8 digit NCM code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidNcm("0101.21.00"); // true
 * isValidNcm("01012100"); // true
 * isValidNcm("00000000"); // false
 * isValidNcm("abc01012100"); // false (not a documented form)
 * isValidNcm(-84713012); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const isValidNcm = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = typeof value === "number" ? String(value) : value.trim();

	if (!NCM_FORMAT_REGEX.test(code)) return false;

	return getCache().has(sanitizeToDigits(code));
};
