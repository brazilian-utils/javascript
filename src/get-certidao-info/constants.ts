/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of
 * the codes 1 to 9: Livro A (nascimento), Livro B (casamento), Livro B Auxiliar (casamento
 * religioso com efeito civil), Livro C (óbito), Livro C Auxiliar (natimorto), Livro D
 * (proclamas), Livro E (demais atos), Livro E desdobrado para emancipações and Livro E
 * desdobrado para interdições.
 *
 * The codes 1 to 7 are the table in force, art. 473, V of the Código Nacional de Normas da
 * Corregedoria Nacional de Justiça (Provimento CNJ nº 149/2023, inciso V in the redação of the
 * Provimento CN nº 182/2024), from "1: Livro A (Nascimento)" to "7: Livro E (Demais atos
 * relativos ao registro civil)". The codes 8 and 9 come from the Provimento CNJ nº 3/2009, art.
 * 7º, V: "8: Livro E (Desdobrado para registro específico das Emancipações)" and "9: Livro E
 * (Desdobrado para registro específico das Interdições)". That provimento was revoked by the
 * Provimento CNJ nº 63/2017, but the certidões issued under it from 2010 on carry those
 * matrículas and are still valid documents, so both codes are kept.
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
 * 7 + 2 positions art. 473 carries today (revoked by the Provimento CNJ nº 63/2017; historical).
 * Its inciso V also listed "8: Livro E (Desdobrado para registro específico das Emancipações)"
 * and "9: Livro E (Desdobrado para registro específico das Interdições)", which art. 473, V no
 * longer has but which are still accepted, the certidões issued under it carrying them, and its
 * inciso IX had the check digits "formado automaticamente por meio do programa" the CNJ
 * Corregedoria handed to the registrars, whose algorithm was never published.
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Description of the nine books and their codes.
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
