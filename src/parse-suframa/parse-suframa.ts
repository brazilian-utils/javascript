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
 * @see Official: https://portal.fazenda.sp.gov.br/servicos/nfce/Downloads/Manual_de_Orientacao_Contribuinte_v_6.pdf
 * Manual de Orientação do Contribuinte da NF-e 6.0, Anexo XII.01 and field E18 (`ISUF`, numeric,
 * 8 or 9 positions).
 */
export const parseSuframa = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, SUFRAMA_LENGTH);
