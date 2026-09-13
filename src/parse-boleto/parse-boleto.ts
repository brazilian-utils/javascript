import { ARRECADACAO_LINE_LENGTH, ARRECADACAO_PRODUCT } from "../_internals/constants/arrecadacao";
import { BOLETO_LENGTH } from "../_internals/constants/boleto";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes boleto formatting characters and returns only digits.
 *
 * Bank slips starting with `8` are "arrecadação" (convênio/tributos) slips, whose linha
 * digitável has 48 digits instead of the 47 of a "cobrança bancária" slip.
 *
 * @param {string|number} value - The boleto value to be parsed.
 * @returns {string} The boleto value without formatting.
 *
 * @example
 * ```typescript
 * parseBoleto("10491.44338 55119.000002 00000.000141 3 25230000093423");
 * // "10491443385511900000200000000141325230000093423"
 *
 * parseBoleto("82630000001-1 09880010070-2 02410202400-0 00020510451-9");
 * // "826300000011098800100702024102024000000205104519"
 * ```
 *
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3166/33/pt-br/layout-cobranca FEBRABAN,
 * "Layout Padrão de Cobrança / Especificações Técnicas para Cobrança", the cobrança bancária
 * layout behind the 47 digit linha digitável and its fator de vencimento.
 */
export const parseBoleto = (value: string | number): string => {
	if (isNullish(value)) return "";

	const digits = sanitizeToDigits(value);

	return digits.slice(
		0,
		digits.startsWith(ARRECADACAO_PRODUCT) ? ARRECADACAO_LINE_LENGTH : BOLETO_LENGTH,
	);
};
