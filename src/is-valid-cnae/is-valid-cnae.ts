import { CNAE_SUBCLASSES } from "../_internals/constants/cnae";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates if a CNAE (Classificação Nacional de Atividades Econômicas) subclass code
 * exists in the official CNAE 2.3 table.
 *
 * @param {string|number} value - The CNAE code to be validated, with or without the
 * `NNNN-N/NN` mask, e.g. `"6201-5/01"`, `"6201501"` or `6201501`.
 * @returns {boolean} True when the code is a known 7 digit subclass, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnae("6201-5/01"); // true
 * isValidCnae("6201501"); // true
 * isValidCnae(6201501); // true
 * isValidCnae("0000000"); // false
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 */
export const isValidCnae = (value: string | number): boolean => {
	if (isNullish(value) || value === "") return false;

	const digits = sanitizeToDigits(value);

	return digits.length === 7 && digits in CNAE_SUBCLASSES;
};
