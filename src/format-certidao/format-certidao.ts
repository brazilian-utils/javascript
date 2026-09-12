import { CERTIDAO_PATTERN } from "../_internals/constants/certidao";
import { type FormatParams, format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

export type FormatCertidaoOptions = Pick<FormatParams, "pad">;

/**
 * Formats the matrícula of a certidão de registro civil into the printed mask of the
 * Provimento, the 32 digits grouped as 6 2 2 4 1 5 3 7 2 and separated by spaces.
 *
 * @param {string|number} value - The matrícula value to be formatted. It can be a string or a number.
 * @param {FormatCertidaoOptions} [options] - Optional formatting options.
 * @param {boolean} options.pad - If true, pads the value with leading zeros if necessary.
 * @returns {string} The formatted matrícula in the pattern "000000 00 00 0000 0 00000 000 0000000 00".
 *
 * @example
 * ```typescript
 * formatCertidao("10453901552013100012021000012321");
 * // "104539 01 55 2013 1 00012 021 0000123 21"
 *
 * formatCertidao("104539.01.55.2013.1.00012.021.0000123-21");
 * // "104539 01 55 2013 1 00012 021 0000123 21"
 *
 * formatCertidao("1552010100020112000012087", { pad: true });
 * // "000000 01 55 2010 1 00020 112 0000120 87"
 * ```
 *
 * @see Official: Provimento CNJ 46/2015, art. 1º and Anexo (Código Nacional de Serventias).
 * @see Based on: http://ghiorzi.org/DVnew.htm Worked example of the two check digits
 * (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const formatCertidao = (value: string | number, options?: FormatCertidaoOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: CERTIDAO_PATTERN,
			});
