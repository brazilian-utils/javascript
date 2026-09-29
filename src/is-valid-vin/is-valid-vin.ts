import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import {
	VIN_CHECK_DIGIT_POSITION,
	VIN_ASCII_REGEX,
	VIN_LENGTH,
	VIN_MODEL_YEAR_EXCLUDED,
	VIN_MODEL_YEAR_POSITION,
	VIN_TRANSLITERATION,
	VIN_WEIGHTS,
} from "./constants";

/** Options of `isValidVin`. */
export type IsValidVinOptions = {
	/**
	 * Whether to also enforce the North-American rules of 49 CFR 565.15: the check digit at the 9th
	 * position and a model year code other than `U`, `Z` or `0` at the 10th (default: `false`, the
	 * Brazilian rule, which mandates neither; read for truthiness).
	 */
	checkDigit?: boolean;
};

/**
 * Validates a VIN (Vehicle Identification Number / chassi).
 *
 * By default checks 17 characters in the three sections of Resolução CONTRAN nº 968/2022, art. 3º
 * (the WMI, the VDS and the VIS), each a digit or a capital letter other than `I`, `O` and `Q`.
 * The `I`, `O` and `Q` exclusion comes from ISO 3779:2009, not from the resolution, which lists no
 * forbidden character and refers the engraving to ABNT NBR 6066:2022 (art. 5º), a paid standard
 * with no official free copy; the regularization VINs of its Anexo II are written without those
 * letters. The resolution does not mandate a check digit, and many Brazilian-built VINs do not
 * carry one, so `isValidVin("9BWZZZ377VT004251")`, a Volkswagen built in Brazil, is valid.
 *
 * `{ checkDigit: true }` adds the North-American rules of 49 CFR 565.15 (SAE J853): the 9th
 * character has to be the weighted MOD 11 check digit (`0` to `9` or `X`) of the transliterated
 * VIN, and the 10th, the model year code, may not be `U`, `Z` or `0`. Use it for a VIN of a
 * vehicle built for the United States or Canada.
 *
 * Case-insensitive and trims surrounding whitespace. A VIN is printed as one unbroken run of 17
 * characters, so, unlike the documents this package masks (`isValidCpf`, `isValidCnpj`,
 * `isValidNfeKey`), it has no group boundary to write a separator at and none is accepted: a
 * space, `.`, `-` or `/` among the characters is rejected instead of being stripped.
 *
 * A value whose 17 characters are all the same (`"00000000000000000"`) is rejected, as every other
 * validator of this package rejects a repeated-digit document (`isValidCpf("00000000000")`,
 * `isValidCns`, `isValidCaepf`, `isValidCei`): no WMI, VDS and VIS are built out of a single
 * repeated character, and it is what a placeholder or a zero-filled field looks like.
 *
 * Up to 2.4.0 the check digit was always enforced, so a Brazilian VIN without one, such as
 * "9BWZZZ377VT004251", was rejected; pass `{ checkDigit: true }` to keep that behaviour.
 *
 * @param {string} value - The VIN to be validated.
 * @param {IsValidVinOptions} [options] - Optional validation options.
 * @param {boolean} [options.checkDigit] - If truthy, also enforces the 49 CFR 565.15 check digit
 * and model year code. Defaults to false.
 * @returns {boolean} True when `value` is a 17 character VIN under the chosen rule.
 *
 * @example
 * ```typescript
 * isValidVin("9BWZZZ377VT004251"); // true (Brazilian VIN, no check digit)
 * isValidVin("9BWZZZ377VT004251", { checkDigit: true }); // false (its 9th character is not the check digit)
 * isValidVin("1HGCM82633A004352", { checkDigit: true }); // true
 * isValidVin("1m8gdm9axkp042788", { checkDigit: true }); // true (check digit X, lowercase)
 * isValidVin("1HGCM82633A004353", { checkDigit: true }); // false (bad check digit)
 * isValidVin("00000000000000000"); // false (every character the same)
 * isValidVin("1HGCM8263IA004352"); // false (contains the excluded letter I)
 * isValidVin("1HGCM82633A00435"); // false (16 characters)
 * ```
 *
 * The ISO catalogue page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser, where it renders the standard's paywalled
 * abstract rather than its text.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf
 * Resolução CONTRAN nº 968, de 20 de junho de 2022, art. 3º, I to IV: the VIN is a "combinação de
 * 17 caracteres" in three sections (WMI, VDS and VIS, of 3, 6 and 8 characters), with no check
 * digit and no forbidden character; art. 5º refers the engraving to ABNT NBR 6066:2022; art. 50,
 * II revoked Resolução nº 24/1998 from 1 January 2025.
 * @see Official: https://www.iso.org/standard/52200.html
 * ISO 3779:2009, the VIN content and structure, source of the `I`, `O` and `Q` exclusion.
 * @see Official: https://www.ecfr.gov/current/title-49/section-565.15
 * 49 CFR 565.15: "The check digit, zero through nine (0-9) or the letter "X" shall appear in VIN
 * position nine (9)", and the model year code of position ten, which leaves out `U`, `Z` and `0`;
 * enforced only under `{ checkDigit: true }`.
 * @see Official: https://vpic.nhtsa.dot.gov/api/
 */
export const isValidVin = (value: string, options?: IsValidVinOptions): boolean => {
	if (typeof value !== "string") return false;

	const trimmed = value.trim();

	if (trimmed.length !== VIN_LENGTH || !VIN_ASCII_REGEX.test(trimmed)) return false;

	const vin = trimmed.toUpperCase();

	if (isRepeatedDigits(vin)) return false;

	// Stryker disable next-line StringLiteral: generateChecksum strips this to digits, so it's inert.
	let transliteratedDigits = "";

	for (const character of vin) {
		if (!(character in VIN_TRANSLITERATION)) return false;

		transliteratedDigits += VIN_TRANSLITERATION[character];
	}

	if (!(options?.checkDigit ?? false)) return true;

	if (VIN_MODEL_YEAR_EXCLUDED.includes(vin[VIN_MODEL_YEAR_POSITION])) return false;

	const remainder = generateChecksum({ base: transliteratedDigits, weight: VIN_WEIGHTS }) % 11;
	const expected = remainder === 10 ? "X" : String(remainder);

	return expected === vin[VIN_CHECK_DIGIT_POSITION];
};
