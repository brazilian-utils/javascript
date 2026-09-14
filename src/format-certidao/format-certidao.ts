import { CERTIDAO_PATTERN } from "../_internals/constants/certidao";
import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatCertidao`. */
export type FormatCertidaoOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats the matrícula of a certidão de registro civil into the printed mask of the norm, the
 * 32 digits grouped as 6 2 2 4 1 5 3 7 2 and separated by spaces.
 *
 * The parameter is typed as a string because the 32 digits of a matrícula are more than a
 * JavaScript number can hold exactly. At runtime the value is read for its digits and masked as
 * far as they go, like in every formatter of this package, so a partial matrícula still being
 * typed is masked progressively and a number is read as the string of its digits.
 *
 * @param {string} value - The matrícula value to be formatted.
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
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Código Nacional de Normas da Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento
 * CNJ nº 149/2023), art. 473 as currently published: the in-force layout of the 32 digit
 * matrícula. Inciso II and §§ 1º and 3º to 5º carry the redação of the Provimento CN nº 237, de
 * 13/07/2026; the rest of the article, § 2º included, and the digit layout this library depends
 * on, come from the Provimento CN nº 182, de 17/09/2024.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311
 * Provimento CNJ nº 2, de 27/04/2009, art. 1º and 2º, which instituted the modelos únicos de
 * certidão and ordered that "as certidões passarão a consignar matrícula que identifica o código
 * nacional da serventia, o código do acervo, o tipo do serviço prestado, o tipo do livro, o número
 * do livro, o número da folha, o número do termo e o digito verificador" (revoked; historical).
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1310
 * Provimento CNJ nº 3, de 17/11/2009, art. 7º, which is where that matrícula first got its digit
 * structure: "a matrícula, de inserção obrigatória nas certidões (primeira e demais vias) emitidas
 * pelos Cartórios de Registro Civil das Pessoas Naturais a partir de 1º de janeiro de 2010, é
 * formada pelos seguintes elementos", incisos I to IX fixing the same 6 + 2 + 2 + 4 + 1 + 5 + 3 +
 * 7 + 2 positions art. 473 carries today (revoked; historical).
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Worked example of the two check digits (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const formatCertidao = (value: string, options?: FormatCertidaoOptions): string =>
	isNullish(value)
		? ""
		: format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: CERTIDAO_PATTERN,
			});
