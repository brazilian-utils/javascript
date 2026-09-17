import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes legal process formatting characters and returns only digits.
 *
 * @param {string|number} value - The legal process value to be parsed.
 * @returns {string} The legal process value without formatting.
 *
 * @example
 * ```typescript
 * parseProcessoJuridico("0002080-34.2026.5.15.0049"); // "00020803420265150049"
 * ```
 *
 * Resolução CNJ nº 65/2008 defines this Número Único de Processo layout and its check digits.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export const parseProcessoJuridico = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, PROCESSO_JURIDICO_LENGTH);
