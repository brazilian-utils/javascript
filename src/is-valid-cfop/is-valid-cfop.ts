import { CFOP_TABLE } from "../_internals/constants/cfop";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates if a CFOP (Código Fiscal de Operações e Prestações) code exists in the
 * official table.
 *
 * @param {string|number} value - The CFOP code to be validated.
 * @returns {boolean} True when the code is a known 4 digit CFOP code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCfop("5102"); // true
 * isValidCfop(5102); // true
 * isValidCfop("0000"); // false
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_007_01
 * @see Based on: https://raw.githubusercontent.com/jansenfelipe/cfop/master/cfop.csv
 * Community-maintained CSV mirror of the official CFOP table used to build `CFOP_TABLE`.
 */
export const isValidCfop = (value: string | number): boolean => {
	if (isNullish(value)) return false;

	const digits = sanitizeToDigits(value);

	return digits in CFOP_TABLE;
};
