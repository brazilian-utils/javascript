import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CNS (Cartão Nacional de Saúde) formatting characters and returns only digits.
 *
 * The number the ANVISA and DATASUS routines check has 15 digits, the length the result is
 * capped at; a shorter value passes through as far as it goes, so the parser can strip the mask
 * off an input still being typed. Use `isValidCns` to check the number itself.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CNS value to be parsed.
 * @returns {string} Up to 15 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCns("123 4567 8901 0000"); // "123456789010000"
 * parseCns(-123456789010000); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/
 * ANVISA's validation routines, which fix the 15 digit length. The page sits behind a bot filter
 * and answers HTTP 403 to every non-browser client, so it has to be opened in a browser.
 * @see Based on: https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html
 * e-SUS APS documentation of the same DATASUS algorithm, reachable without a browser.
 */
export const parseCns = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
