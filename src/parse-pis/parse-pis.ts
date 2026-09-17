import { PIS_LENGTH } from "../_internals/constants/pis";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Removes PIS formatting characters and returns only digits.
 *
 * @param {string|number} value - The PIS value to be parsed.
 * @returns {string} The PIS value without formatting.
 *
 * @example
 * ```typescript
 * parsePis("120.12345.67-8"); // "12012345678"
 * ```
 *
 * @see Official: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/inscricao
 * @see Official: https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-manual-de-orientacao-do-esocial-vs-2-4.pdf
 * @see Official: https://www.sirc.gov.br/wp-content/uploads/manual_sirc_recomendacoes_tecnicas_v7.pdf
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/pis.py
 */
export const parsePis = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, PIS_LENGTH);
