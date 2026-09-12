/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 9: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas), Livro E (demais atos), Livro E desdobrado para emancipações and Livro E
 * desdobrado para interdições.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1310 Provimento CNJ nº 3, de 17/11/2009,
 * which instituted the modelo único de certidão and its 32 digit matrícula.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311 Provimento CNJ nº 2, de 27/04/2009,
 * which instituted the Código Nacional de Serventias (CNS).
 * @see Based on: http://ghiorzi.org/DVnew.htm Description of the nine books and their codes.
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
