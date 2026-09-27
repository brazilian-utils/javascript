/**
 * Per-state IE (Inscrição Estadual) validation tables.
 *
 * @see Official: http://www.sintegra.gov.br/insc_est.html
 */

export const AC_PREFIXES = ["01"];

export const AL_PREFIXES = ["24"];

/**
 * The tipo de empresa, the third digit of an AL registration, as the SINTEGRA AL page lists it:
 * "0-Normal, 3-Produtor Rural, 5-Substituta, 7- Micro-Empresa Ambulante, 8-Micro-Empresa".
 */
export const AL_COMPANY_TYPES = ["0", "3", "5", "7", "8"];

export const BA_MOD_10_DIGITS = [0, 1, 2, 3, 4, 5, 8];

/** 07 on the SINTEGRA page; 08 since the numbers starting with 07 ran out. */
export const DF_PREFIXES = ["07", "08"];

/**
 * The union of three official sources that disagree: IN nº 946/09-GSF, art. 39, I (as worded by
 * IN nº 1.535/22-GSE) gives 10 and 20 (pessoa jurídica) and 11 (pessoa física); the SINTEGRA GO
 * page gives "10 ou 11 ou 20 a 29"; the Secretaria da Economia's roteiro de crítica (2012) gives
 * "10 ou 11 ou 15". No norm names 15 or 21 to 29.
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

/**
 * The six prefixes the SINTEGRA PA page lists ("Composição: 15NNNNNN-D; 75NNNNNN-D; 76NNNNNN-D;
 * 77NNNNNN-D; 78NNNNNN-D; 79 NNNNNN-D"), the page SEFA-PA's notice of 08/10/2024 on the prefix 75
 * points to for the details of the registration.
 */
export const PA_PREFIXES = ["15", "75", "76", "77", "78", "79"];

/**
 * The weights of the old 14 digit CACEPE number on the SINTEGRA PE page ("Dígito Verificador da
 * Inscrição Estadual Antiga"), from the first of its 13 principal digits to the last.
 */
export const PE_LEGACY_WEIGHTS = [5, 4, 3, 2, 1, 9, 8, 7, 6, 5, 4, 3, 2];

export const SP_FIRST_WEIGHTS = [1, 3, 4, 5, 6, 7, 8, 10];

export const SP_SECOND_WEIGHTS = [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export const TO_TYPES = ["01", "02", "03", "99"];
