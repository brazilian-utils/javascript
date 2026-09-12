import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CSOSN_CODES } from "./constants";

/**
 * Validates if a CSOSN (Código de Situação da Operação no Simples Nacional) code is valid.
 *
 * Accepted codes are `101, 102, 103, 201, 202, 203, 300, 400, 500, 900`.
 *
 * @param {string|number} value - The CSOSN code to be validated.
 * @returns {boolean} True when the code is a known CSOSN code, false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10 Ajuste
 * SINIEF 03/2010, which instituted the CSOSN table.
 *
 * @example
 * ```typescript
 * isValidCsosn("101"); // true
 * isValidCsosn(900); // true
 * isValidCsosn("999"); // false
 * ```
 */
export const isValidCsosn = (value: string | number): boolean => {
	if (isNullish(value)) return false;

	const digits = sanitizeToDigits(value);

	return (CSOSN_CODES as readonly string[]).includes(digits);
};
