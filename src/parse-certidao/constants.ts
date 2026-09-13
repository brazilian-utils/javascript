/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 9: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas), Livro E (demais atos), Livro E desdobrado para emancipações and Livro E
 * desdobrado para interdições.
 *
 * The in-force art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de Justiça
 * lists only the codes 1 to 7, and no CNJ primary text reachable today publishes the other two:
 * the Anexo IV of the revoked Provimento CNJ nº 63/2017 lists the same seven. The codes 8
 * (emancipação) and 9 (interdição) come from the `Based on:` references below: ghiorzi.org prints
 * the nine book list and the cited Casilhero support class maps the same nine. They are kept
 * because matrículas carrying them circulate.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Código Nacional de Normas da Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento
 * CNJ nº 149/2023), art. 473 as currently published: the in-force layout of the 32 digit
 * matrícula. Inciso II and §§ 1º to 5º carry the redação of the Provimento CN nº 237, de
 * 13/07/2026; the rest of the article, and the digit layout this library depends on, come from the
 * Provimento CN nº 182, de 17/09/2024.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311
 * Provimento CNJ nº 2, de 27/04/2009, which instituted the modelos únicos de certidão and the
 * matrícula (revoked; historical).
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Description of the nine books and their codes.
 * @see Based on: https://github.com/Casilhero/brazilian-validators/blob/main/src/Support/CertidaoInfo.php
 * Reference implementation agreeing on the same nine books, in the same order.
 */
export const CERTIDAO_TYPES = [
	"birth",
	"marriage",
	"religious-marriage",
	"death",
	"stillbirth",
	"banns",
	"other",
	"emancipation",
	"interdiction",
] as const;
