import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Formats a NCM (Nomenclatura Comum do Mercosul) code.
 *
 * This is a purely structural transformation, it does not check the code against the
 * official table, use `isValidNcm` for that.
 *
 * @param {string|number} value - The NCM code to be formatted.
 * @returns {string} The formatted code in the `NNNN.NN.NN` pattern, or an empty string
 * when there is nothing to format.
 *
 * @example
 * ```typescript
 * formatNcm("84713012"); // "8471.30.12"
 * formatNcm(84713012); // "8471.30.12"
 * formatNcm("8471"); // "8471" (partial values are formatted progressively)
 * ```
 *
 * @see Official: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
 */
export const formatNcm = (value: string | number): string =>
	isNullish(value) || value === ""
		? ""
		: format({
				value: sanitizeToDigits(value),
				pattern: "0000.00.00",
			});
