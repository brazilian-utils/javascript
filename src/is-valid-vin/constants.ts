/**
 * VIN (Vehicle Identification Number / chassi) layout: 17 characters in three sections, the WMI
 * (3 characters), the VDS (6) and the VIS (8), per Resolução CONTRAN nº 968/2022, art. 3º, I to
 * IV, written with the digits and the capital letters except `I`, `O` and `Q` (dropped to avoid
 * confusion with `1` and `0`), per ISO 3779:2009. This is the rule `isValidVin` checks by default.
 *
 * The resolution itself lists no forbidden character: it only has the VIN engraved "de acordo
 * com as especificações e formatos estabelecidos pela norma [...] ABNT NBR 6066:2022" (art. 5º),
 * a paid standard with no official free copy, and forbids "caracteres especiais, espaços em
 * branco ou qualquer outra simbologia" in the RENAVAM records (art. 43, § 1º). The `I`, `O` and
 * `Q` exclusion is ISO 3779's; the VINs the resolution's Anexo II assigns for regularization
 * (WMI `XXX`, codes such as `D0A`, `C0L` and `1MP`) are written with `0` and `1`, so they pass it.
 *
 * The check digit at the 9th position, its transliteration table and its weighted MOD 11
 * algorithm, and the model year code at the 10th position that may not be `U`, `Z` or `0`, are
 * North-American requirements (49 CFR 565.15 / SAE J853), which `isValidVin` only enforces under
 * `{ checkDigit: true }`: Resolução CONTRAN nº 968/2022 (which replaced Resolução CONTRAN nº
 * 24/1998 from 1 January 2025, art. 50, II) does not mandate them, and many Brazilian-built VINs
 * do not carry a matching check digit; in the regularization VINs of its Anexo II the 9th
 * character is copied from the original chassis or filled with `0`.
 *
 * The ISO catalogue page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser, where it renders the standard's paywalled
 * abstract rather than its text.
 *
 * @see Official: https://www.iso.org/standard/52200.html
 * @see Official: https://www.ecfr.gov/current/title-49/section-565.15
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf
 * Resolução CONTRAN nº 968, de 20 de junho de 2022, art. 3º, I to IV (VIN, "combinação de 17
 * caracteres", in the three sections WMI, VDS and VIS of 3, 6 and 8 characters), art. 5º (engraving
 * per ABNT NBR 6066:2022) and art. 50, II (revocation of Resolução nº 24/1998 from 1 January 2025).
 * It lists no forbidden character and no check digit.
 * @see Official: https://vpic.nhtsa.dot.gov/api/
 */
export const VIN_LENGTH = 17;

export const VIN_CHECK_DIGIT_POSITION = 8;

export const VIN_MODEL_YEAR_POSITION = 9;

/** Characters 49 CFR 565.15 leaves out of the model year code, the 10th position. */
export const VIN_MODEL_YEAR_EXCLUDED = ["U", "Z", "0"];

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
