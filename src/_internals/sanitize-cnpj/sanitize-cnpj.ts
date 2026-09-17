import { sanitizeToAlphanumeric } from "../sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

/**
 * Sanitizes a CNPJ value to the characters its version is written with: the digits of the
 * numeric CNPJ (version `1`, the default), or the upper cased letters and digits of the
 * alphanumeric one (version `2`).
 *
 * Shared by `formatCnpj` and `parseCnpj`, which read a value the very same way.
 *
 * @param {string|number} value - The CNPJ value to sanitize.
 * @param {1|2} [version] - The CNPJ version to read the value as. Defaults to the numeric one.
 * @returns {string} The sanitized value.
 *
 * @example
 * ```typescript
 * sanitizeCnpj("11.222.333/0001-81"); // "11222333000181"
 * sanitizeCnpj("12.ABC.345/01DE-35", 2); // "12ABC34501DE35"
 * sanitizeCnpj("12.ABC.345/01DE-35"); // "123450135", the digits only
 * ```
 */
export const sanitizeCnpj = (value: string | number, version?: 1 | 2): string => {
	if (version === 2) {
		return sanitizeToAlphanumeric(value);
	}

	return sanitizeToDigits(value);
};
