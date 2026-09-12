/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 9: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas), Livro E (demais atos), Livro E desdobrado para emancipações and Livro E
 * desdobrado para interdições.
 *
 * The in-force art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de Justiça
 * lists only the codes 1 to 7. The codes 8 (emancipação) and 9 (interdição) come from the Anexo
 * IV of the revoked Provimento CNJ nº 63/2017 and are kept because matrículas issued under it
 * are still in circulation.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243 Código Nacional de Normas da
 * Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento CNJ nº 149/2023), art. 473
 * in the wording of the Provimento CN nº 182, de 17/09/2024: the in-force layout of the 32
 * digit matrícula.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311 Provimento CNJ nº 2, de 27/04/2009,
 * which instituted the modelos únicos de certidão and the matrícula (revoked; historical).
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
