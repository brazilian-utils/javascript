/**
 * Per-state IE (Inscrição Estadual) validation tables.
 *
 * @see Official: http://www.sintegra.gov.br/insc_est.html
 */

export const AC_PREFIXES = ["01"];

export const AL_PREFIXES = ["24"];

export const BA_MOD_10_DIGITS = [0, 1, 2, 3, 4, 5, 8];

/** 07 on the SINTEGRA page; 08 since the numbers starting with 07 ran out. */
export const DF_PREFIXES = ["07", "08"];

/**
 * 10, 11 and 15 from the SEFAZ-GO roteiro de crítica; 20 to 29 from the SINTEGRA page ("AB pode ser
 * igual a 10 ou 11 ou 20 a 29"), the range SEFAZ-GO has issued to companies since 13/01/2023.
 */
export const GO_PREFIXES = [
	"10",
	"11",
	"15",
	"20",
	"21",
	"22",
	"23",
	"24",
	"25",
	"26",
	"27",
	"28",
	"29",
];

export const GO_DUAL_DIGIT_IE = 11_094_402;

export const GO_SPECIAL_RANGE_START = 10_103_105;

export const GO_SPECIAL_RANGE_END = 10_119_997;

export const MA_PREFIXES = ["12"];

export const MS_PREFIXES = ["28", "50"];

export const PA_PREFIXES = ["15", "75", "76", "77", "78", "79"];

export const SP_FIRST_WEIGHTS = [1, 3, 4, 5, 6, 7, 8, 10];

export const SP_SECOND_WEIGHTS = [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export const TO_TYPES = ["01", "02", "03", "99"];
