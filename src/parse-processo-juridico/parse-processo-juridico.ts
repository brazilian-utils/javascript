import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes legal process formatting characters and returns only digits.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * Resolução CNJ nº 65/2008 defines this Número Único de Processo layout and its check digits,
 * whose algorithm is in its Anexo VIII.
 *
 * @param {string|number} value - The legal process value to be parsed.
 * @returns {string} The legal process value without formatting.
 *
 * @example
 * ```typescript
 * parseProcessoJuridico("0002080-34.2026.5.15.0049"); // "00020803420265150049"
 * parseProcessoJuridico(-1); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export const parseProcessoJuridico = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, PROCESSO_JURIDICO_LENGTH) : "";
