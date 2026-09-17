/**
 * Portuguese (pt-BR) number-to-words tables, shared by `numberToWords` and by every public
 * "por extenso" formatter (`convertNumberToWords`, `convertCurrencyToWords`, `convertDateToWords`).
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14822.htm
 * Lei nº 14.822/2024 (Lei Orçamentária Anual de 2024), which spells 14 "quatorze" in the caput of
 * art. 2º and in the caput of art. 3º, both writing the same amount out as "cinco trilhões
 * quatrocentos e quatorze bilhões novecentos e dezenove milhões quatrocentos e noventa e dois mil
 * novecentos e oitenta e seis reais" (the only two occurrences of the word in the law; art. 1º
 * writes an amount with no 14 in it), the form the official Brazilian texts use; the Vocabulário
 * Ortográfico admits both "catorze" and "quatorze", and num2words' Portuguese table (below) picks
 * "quatorze".
 * @see Based on: https://github.com/savoirfairelinux/num2words/blob/master/num2words/lang_PT.py
 * num2words' Portuguese table, the source of every other word of this file.
 */

export const ZERO_WORD = "zero";

export const UNITS: readonly string[] = [
	"zero",
	"um",
	"dois",
	"três",
	"quatro",
	"cinco",
	"seis",
	"sete",
	"oito",
	"nove",
	"dez",
	"onze",
	"doze",
	"treze",
	"quatorze",
	"quinze",
	"dezesseis",
	"dezessete",
	"dezoito",
	"dezenove",
];

export const UNITS_FEMININE_OVERRIDES: Record<number, string> = {
	1: "uma",
	2: "duas",
};

export const TENS: readonly string[] = [
	"",
	"",
	"vinte",
	"trinta",
	"quarenta",
	"cinquenta",
	"sessenta",
	"setenta",
	"oitenta",
	"noventa",
];

export const HUNDRED_EXACT = "cem";

export const HUNDREDS_MASCULINE: readonly string[] = [
	"",
	"cento",
	"duzentos",
	"trezentos",
	"quatrocentos",
	"quinhentos",
	"seiscentos",
	"setecentos",
	"oitocentos",
	"novecentos",
];

export const HUNDREDS_FEMININE: readonly string[] = [
	"",
	"cento",
	"duzentas",
	"trezentas",
	"quatrocentas",
	"quinhentas",
	"seiscentas",
	"setecentas",
	"oitocentas",
	"novecentas",
];

type NumberScaleWord = {
	/** Word used for a group whose value is exactly 1 (e.g. `"mil"`, `"milhão"`). */
	singular: string;
	/** Word used for a group whose value is 0 or 2-999 (e.g. `"mil"`, `"milhões"`). */
	plural: string;
};

export const SCALE_WORDS: readonly NumberScaleWord[] = [
	{ singular: "", plural: "" },
	{ singular: "mil", plural: "mil" },
	{ singular: "milhão", plural: "milhões" },
	{ singular: "bilhão", plural: "bilhões" },
	{ singular: "trilhão", plural: "trilhões" },
];

export const MONTH_NAMES: readonly string[] = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

/**
 * Portuguese (pt-BR) weekday names, indexed like `Date#getDay`/`Date#getUTCDay`
 * (0 = domingo, ..., 6 = sábado), used by `convertDateToWords`'s `weekday` option.
 */
export const WEEKDAY_NAMES: readonly string[] = [
	"domingo",
	"segunda-feira",
	"terça-feira",
	"quarta-feira",
	"quinta-feira",
	"sexta-feira",
	"sábado",
];
