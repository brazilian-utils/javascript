import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { NCM_CODES } from "./constants";

let cache: Set<string> | undefined;

const getCache = (): Set<string> => {
	cache ??= new Set(NCM_CODES);
	return cache;
};

/**
 * Validates if a NCM (Nomenclatura Comum do Mercosul) code exists in the official table.
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
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const isValidNcm = (value: string | number): boolean => {
	if (isNullish(value)) return false;

	const digits = sanitizeToDigits(value);

	return getCache().has(digits);
};
