/**
 * VIN (Vehicle Identification Number / chassi) layout: 17 characters, excluding the letters
 * `I`, `O` and `Q` (dropped to avoid confusion with `1` and `0`), per ISO 3779:2009 structure.
 * The check digit at the 9th position, its transliteration table and its weighted MOD 11
 * algorithm are a North-American requirement (49 CFR 565.15 / SAE J853), not something
 * Resolução CONTRAN nº 968/2022 (which replaced Resolução CONTRAN nº 24/1998 from 1 January 2025,
 * art. 50, II) or ABNT NBR 6066, which define the Brazilian VIN structure, mandate; many Brazilian-built VINs do not carry a matching check digit.
 * The ISO catalogue page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser, where it renders the standard's paywalled
 * abstract rather than its text.
 * @see Official: https://www.iso.org/standard/52200.html
 * @see Official: https://www.ecfr.gov/current/title-49/section-565.15
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf
 * Resolução CONTRAN nº 968, de 20 de junho de 2022, art. 2º, I (VIN of 17 characters in three sections)
 * and art. 50, II (revocation of Resolução nº 24/1998 from 1 January 2025).
 * @see Official: https://vpic.nhtsa.dot.gov/api/
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
