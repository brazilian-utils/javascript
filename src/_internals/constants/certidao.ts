/**
 * Layout of the matrícula of a certidão de registro civil, 32 digits grouped as
 * 6 (CNS da serventia) + 2 (acervo) + 2 (serviço) + 4 (ano) + 1 (tipo do livro) + 5 (livro) +
 * 3 (folha) + 7 (termo) + 2 (dígitos verificadores).
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1310 Provimento CNJ nº 3, de 17/11/2009,
 * which instituted the modelo único de certidão and its 32 digit matrícula.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311 Provimento CNJ nº 2, de 27/04/2009,
 * which instituted the Código Nacional de Serventias (CNS).
 * @see Based on: http://ghiorzi.org/DVnew.htm Worked example of the two check digits
 * (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */

export const CERTIDAO_LENGTH = 32;

export const CERTIDAO_BASE_LENGTH = 30;

export const CERTIDAO_PATTERN = "000000 00 00 0000 0 00000 000 0000000 00";

export const CERTIDAO_FORMAT_REGEX =
	/^\d{6}[\s.\-/]*\d{2}[\s.\-/]*\d{2}[\s.\-/]*\d{4}[\s.\-/]*\d[\s.\-/]*\d{5}[\s.\-/]*\d{3}[\s.\-/]*\d{7}[\s.\-/]*\d{2}$/;
