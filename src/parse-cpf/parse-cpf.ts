import { CPF_LENGTH } from "../_internals/constants/cpf";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes CPF formatting characters and returns only digits.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CPF value to be parsed.
 * @returns {string} The CPF value without formatting.
 *
 * @example
 * ```typescript
 * parseCpf("123.456.789-09"); // "12345678909"
 * parseCpf(-12345678909); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/cpf.py
 */
export const parseCpf = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, CPF_LENGTH) : "";
