import { ARRECADACAO_LINE_LENGTH, ARRECADACAO_PRODUCT } from "../_internals/constants/arrecadacao";
import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { ARRECADACAO_PATTERN, BANCARIO_PATTERN } from "./constants";

/** Options of `formatBoleto`. */
export type FormatBoletoOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a given value as a Brazilian boleto.
 *
 * A 48 digit linha digitável starting with `8` is an "arrecadação" (convênio/tributos) slip
 * and uses the FEBRABAN arrecadação mask (four blocks of 11 digits, each one followed by its
 * own check digit) instead of the "cobrança bancária" mask. The 44 digit arrecadação
 * *barcode* has no display grouping defined by FEBRABAN (§04 describes positions, not a
 * printed form), so it keeps the published "cobrança bancária" grouping.
 *
 * @param {string|number} value - The value to be formatted, either as a string or a number.
 * @param {FormatBoletoOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - Whether to pad the value with leading zeros.
 * @returns {string} The formatted boleto string in the pattern "00000.00000 00000.000000 00000.000000 0 00000000000000" or, for arrecadação, "00000000000-0 00000000000-0 00000000000-0 00000000000-0".
 *
 * @example
 * ```typescript
 * formatBoleto("10491443385511900000200000000141325230000093423");
 * // "10491.44338 55119.000002 00000.000141 3 25230000093423"
 *
 * formatBoleto("826300000011098800100702024102024000000205104519");
 * // "82630000001-1 09880010070-2 02410202400-0 00020510451-9"
 * ```
 *
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3166/33/pt-br/layout-cobranca FEBRABAN,
 * "Layout Padrão de Cobrança / Especificações Técnicas para Cobrança", the cobrança bancária
 * layout behind the 47 digit linha digitável and its fator de vencimento.
 */
export const formatBoleto = (value: string | number, options?: FormatBoletoOptions): string => {
	if (isNullish(value)) return "";

	const digits = sanitizeToDigits(value);

	const isArrecadacaoLine =
		digits.length === ARRECADACAO_LINE_LENGTH && digits.startsWith(ARRECADACAO_PRODUCT);

	return format({
		pad: options?.pad,
		value: digits,
		pattern: isArrecadacaoLine ? ARRECADACAO_PATTERN : BANCARIO_PATTERN,
	});
};
