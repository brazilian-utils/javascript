/**
 * ISO 3779 layout of a VIN (Vehicle Identification Number / chassi): 17 characters, excluding
 * the letters `I`, `O` and `Q` (dropped to avoid confusion with `1` and `0`), with a check
 * digit at the 9th position. Resolução CONTRAN nº 27/1998 requires the same transliteration
 * table and weighted MOD 11 check digit algorithm used across the Americas (SAE J853 / NHTSA
 * 49 CFR 565.15) for vehicles manufactured in or imported into Brazil.
 * @see Official: https://www.iso.org/standard/52200.html ISO 3779:2009 (VIN content and structure)
 * @see Based on: https://vpic.nhtsa.dot.gov/api/ NHTSA vPIC VIN decoding API and WMI table, used
 * as a reference for the transliteration/weights across the Americas.
 */
export const VIN_LENGTH = 17;

export const VIN_CHECK_DIGIT_POSITION = 8;

export const VIN_TRANSLITERATION: Record<string, number> = {
	0: 0,
	1: 1,
	2: 2,
	3: 3,
	4: 4,
	5: 5,
	6: 6,
	7: 7,
	8: 8,
	9: 9,
	A: 1,
	B: 2,
	C: 3,
	D: 4,
	E: 5,
	F: 6,
	G: 7,
	H: 8,
	J: 1,
	K: 2,
	L: 3,
	M: 4,
	N: 5,
	P: 7,
	R: 9,
	S: 2,
	T: 3,
	U: 4,
	V: 5,
	W: 6,
	X: 7,
	Y: 8,
	Z: 9,
};

export const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
