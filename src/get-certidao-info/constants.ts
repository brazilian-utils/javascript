/**
 * The seven books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 7: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas) and Livro E (demais atos).
 *
 * This is the table of art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de
 * Justiça (Provimento CNJ nº 149/2023, as amended by the Provimentos CN nº 182/2024 and nº
 * 237/2026), the tipo do livro in the 15th position of the matrícula, from "1: Livro A
 * (Nascimento)" to "7: Livro E (Demais atos relativos ao registro civil)". The codes 8
 * (emancipação) and 9 (interdição) some community references list (ghiorzi.org, the Casilhero
 * support class) are not in it, emancipações and interdições being among the acts of Livro E, so
 * a matrícula carrying 8 or 9 is rejected.
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
 * Description of the books and their codes; its codes 8 and 9 are not in the official table.
 */
export const CERTIDAO_TYPES = [
	"birth",
	"marriage",
	"religious-marriage",
	"death",
	"stillbirth",
	"banns",
	"other",
] as const;
