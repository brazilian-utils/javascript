/**
 * Portuguese (pt-BR) number-to-words tables, shared by `numberToWords` and by every public
 * "por extenso" formatter (`convertNumberToWords`, `convertCurrencyToWords`, `convertDateToWords`).
 *
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/currency.py
 * "catorze" (not "quatorze") is used for 14, matching num2words pt_BR and brutils.
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
	"catorze",
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

export type NumberScaleWord = {
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
