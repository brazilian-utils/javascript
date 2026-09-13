import { CPF_LENGTH } from "../_internals/constants/cpf";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes CPF formatting characters and returns only digits.
 *
 * @param {string|number} value - The CPF value to be parsed.
 * @returns {string} The CPF value without formatting.
 *
 * @example
 * ```typescript
 * parseCpf("123.456.789-09"); // "12345678909"
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Based on: https://github.com/brazilian-utils/brutils-python/blob/main/brutils/cpf.py
 */
export const parseCpf = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, CPF_LENGTH);
