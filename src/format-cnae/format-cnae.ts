import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Formats a CNAE (Classificação Nacional de Atividades Econômicas) subclass code.
 *
 * This is a purely structural transformation, it does not check the code against the
 * official table, use `isValidCnae` for that.
 *
 * @param {string|number} value - The CNAE code to be formatted.
 * @returns {string} The formatted code in the `NNNN-N/NN` pattern, or an empty string
 * when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatCnae("6201501"); // "6201-5/01"
 * formatCnae(6201501); // "6201-5/01"
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 */
export const formatCnae = (value: string | number): string =>
	isNullish(value) || value === ""
		? ""
		: format({
				value: sanitizeToDigits(value),
				pattern: "0000-0/00",
				pad: true,
			});
