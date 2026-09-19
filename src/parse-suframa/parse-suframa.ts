import { SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes Inscrição SUFRAMA formatting characters and returns only digits, the way the `ISUF`
 * field of the NF-e expects them.
 *
 * @param {string|number} value - The Inscrição SUFRAMA to be parsed.
 * @returns {string} The Inscrição SUFRAMA without formatting.
 *
 * @example
 * ```typescript
 * parseSuframa("12.3456.789"); // "123456789"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e 7.0, Visão Geral, section 8.4, which gives the
 * composition as `SS.NNNN.LLD`.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf
 * MOC 7.0, Anexo I: field 79 (`E18`, `ISUF`) is numeric with 8 to 9 positions.
 */
export const parseSuframa = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, SUFRAMA_LENGTH);
