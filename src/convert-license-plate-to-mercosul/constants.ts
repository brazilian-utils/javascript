/**
 * Official digit to letter conversion table used to turn an old format plate's 5th character
 * into the Mercosul format's embedded letter (0=A, 1=B, ..., 9=J).
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * Resolução CONTRAN nº 969/2022, art. 2º § 4º and Anexo II.
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
