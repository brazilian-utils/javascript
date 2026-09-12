/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 9: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas), Livro E (demais atos), Livro E desdobrado para emancipações and Livro E
 * desdobrado para interdições.
 *
 * @see Official: Provimento CNJ 46/2015, art. 1º and Anexo (Código Nacional de Serventias).
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
