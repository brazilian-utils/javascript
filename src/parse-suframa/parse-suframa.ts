import { SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes Inscrição SUFRAMA formatting characters and returns only digits, the way the `ISUF`
 * field of the NF-e expects them.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The Inscrição SUFRAMA to be parsed.
 * @returns {string} The Inscrição SUFRAMA without formatting.
 *
 * @example
 * ```typescript
 * parseSuframa("12.3456.789"); // "123456789"
 * parseSuframa(10123456.7); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e 7.0, Visão Geral, section 8.4, which gives the
 * composition as `SS.NNNN.LLD`.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf
 * MOC 7.0, Anexo I: field 79 (`E18`, `ISUF`) is numeric with 8 to 9 positions.
 */
export const parseSuframa = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, SUFRAMA_LENGTH) : "";
