import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import {
	VIN_CHECK_DIGIT_POSITION,
	VIN_LENGTH,
	VIN_TRANSLITERATION,
	VIN_WEIGHTS,
} from "./constants";

/**
 * Validates a VIN (Vehicle Identification Number / chassi).
 *
 * Checks the length (17 characters), the excluded letters (`I`, `O`, `Q` are never valid; ISO
 * 3779:2009 structure) and the check digit at the 9th position, with the check digit and
 * transliteration computed per 49 CFR 565.15. That 9th-position check digit is a North-American
 * requirement (49 CFR 565.15 / SAE J853): Resolução CONTRAN nº 968/2022 (in force since 1 July 2022, revoking Resolução CONTRAN nº 24/1998 from
 * 1 January 2025 by its art. 50, II) and ABNT NBR 6066 define
 * the Brazilian VIN structure but do not mandate it, so many Brazilian-built VINs do not carry
 * a matching check digit. This function is therefore a North-American-style structural check,
 * not a universal validator of Brazilian VINs. Case-insensitive and trims surrounding whitespace.
 *
 * A VIN is printed as one unbroken run of 17 characters, so, unlike the documents this package
 * masks (`isValidCpf`, `isValidCnpj`, `isValidNfeKey`), it has no group boundary to write a
 * separator at and none is accepted: a space, `.`, `-` or `/` among the characters is rejected
 * instead of being stripped.
 *
 * A value whose 17 characters are all the same (`"00000000000000000"`) is rejected even when it
 * carries a matching check digit, as every other validator of this package rejects a
 * repeated-digit document (`isValidCpf("00000000000")`, `isValidCns`, `isValidCaepf`,
 * `isValidCei`): no WMI, VDS and VIS are built out of a single repeated character, and it is what
 * a placeholder or a zero-filled field looks like.
 *
 * @param {string} value - The VIN to be validated.
 * @returns {boolean} True when `value` is a 17 character VIN with a matching check digit.
 *
 * @example
 * ```typescript
 * isValidVin("1HGCM82633A004352"); // true
 * isValidVin("1m8gdm9axkp042788"); // true (check digit X, lowercase)
 * isValidVin("JH4TB2H26CC000000"); // true
 * isValidVin("1HGCM82633A004353"); // false (bad check digit)
 * isValidVin("00000000000000000"); // false (every character the same, though the check digit matches)
 * isValidVin("1HGCM8263IA004352"); // false (contains the excluded letter I)
 * isValidVin("1HGCM82633A00435"); // false (16 characters)
 * ```
 *
 * The ISO catalogue page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser, where it renders the standard's paywalled
 * abstract rather than its text.
 *
 * @see Official: https://www.iso.org/standard/52200.html
 * @see Official: https://www.ecfr.gov/current/title-49/section-565.15
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf
 * Resolução CONTRAN nº 968, de 20 de junho de 2022, art. 2º, I (VIN of 17 characters in three sections)
 * and art. 50, II (revocation of Resolução nº 24/1998 from 1 January 2025).
 * @see Official: https://vpic.nhtsa.dot.gov/api/
 */
export const isValidVin = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const vin = value.trim().toUpperCase();

	if (vin.length !== VIN_LENGTH) return false;

	if (isRepeatedDigits(vin)) return false;

	// Stryker disable next-line StringLiteral: generateChecksum strips this to digits, so it's inert.
	let translitDigits = "";

	for (const char of vin) {
		if (!(char in VIN_TRANSLITERATION)) return false;

		translitDigits += VIN_TRANSLITERATION[char];
	}

	const checkDigit = vin[VIN_CHECK_DIGIT_POSITION];

	const remainder = generateChecksum({ base: translitDigits, weight: VIN_WEIGHTS }) % 11;
	const expected = remainder === 10 ? "X" : String(remainder);

	return expected === checkDigit;
};
