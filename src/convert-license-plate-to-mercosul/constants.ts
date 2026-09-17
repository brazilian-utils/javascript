/**
 * Digit to letter conversion table used to turn an old format plate's 5th character into the
 * Mercosul format's embedded letter (0=A, 1=B, ..., 9=J).
 *
 * Resolução CONTRAN nº 969/2022, art. 2º § 4º, is what requires the substitution, "conforme
 * padrão previsto no Anexo II". The table itself is that Anexo II, which calls it a "tabela
 * equiparativa, para substituição do antepenúltimo caractere, de número para letra". Its range
 * of letters is deliberately limited to `A` through `J`, "apenas para a conversão da PNU para o
 * novo sistema de PIV". The annexes are published in a PDF of their own, separate from the
 * resolution's text; both are cited below.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf
 */
export const DIGIT_TO_MERCOSUL_LETTER: Record<string, string> = {
	"0": "A",
	"1": "B",
	"2": "C",
	"3": "D",
	"4": "E",
	"5": "F",
	"6": "G",
	"7": "H",
	"8": "I",
	"9": "J",
};
