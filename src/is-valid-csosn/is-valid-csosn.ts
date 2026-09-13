import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CSOSN_CODES, CSOSN_FORMAT_REGEX } from "./constants";

/**
 * Validates if a CSOSN (Código de Situação da Operação no Simples Nacional) code is valid.
 *
 * Accepted codes are `101, 102, 103, 201, 202, 203, 300, 400, 500, 900`, the table the
 * consolidated Anexo III-A of Convênio SINIEF s/nº 1970 carries.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 3
 * digits, with a single separator between them and optional surrounding whitespace. Anything
 * else (`"abc101"`) is rejected instead of having its digits picked out. A number is only read
 * as a code when it is a non-negative safe integer, since a sign, a decimal point or a rounded
 * magnitude would otherwise be read as a code the caller never wrote.
 *
 * @param {string|number} value - The CSOSN code to be validated, e.g. `"101"` or `101`.
 * @returns {boolean} True when the code is a known CSOSN code, false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, whose Anexo III-A carries the CSOSN table in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10
 * Ajuste SINIEF 03/2010, which instituted the CSOSN table.
 *
 * @example
 * ```typescript
 * isValidCsosn("101"); // true
 * isValidCsosn(900); // true
 * isValidCsosn("999"); // false
 * isValidCsosn("abc101"); // false (not a documented form)
 * isValidCsosn(-101); // false (not a non-negative safe integer)
 * ```
 */
export const isValidCsosn = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const code = typeof value === "number" ? String(value) : value.trim();

	if (!CSOSN_FORMAT_REGEX.test(code)) return false;

	return (CSOSN_CODES as readonly string[]).includes(sanitizeToDigits(code));
};
