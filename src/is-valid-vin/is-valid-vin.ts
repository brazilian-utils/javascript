import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import {
	VIN_CHECK_DIGIT_POSITION,
	VIN_LENGTH,
	VIN_TRANSLITERATION,
	VIN_WEIGHTS,
} from "./constants";

/**
 * Validates a VIN (Vehicle Identification Number / chassi) under ISO 3779.
 *
 * Checks the length (17 characters), the excluded letters (`I`, `O`, `Q` are never valid) and
 * the check digit at the 9th position, calculated with the ISO 3779 transliteration table and
 * a weighted MOD 11 sum, mandatory for vehicles manufactured in or imported into Brazil under
 * Resolução CONTRAN nº 27/1998. Case-insensitive and trims surrounding whitespace.
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
 * isValidVin("1HGCM8263IA004352"); // false (contains the excluded letter I)
 * isValidVin("1HGCM82633A00435"); // false (16 characters)
 * ```
 *
 * @see Official: https://www.iso.org/standard/52200.html ISO 3779:2009 (VIN content and structure)
 * @see Based on: https://vpic.nhtsa.dot.gov/api/ NHTSA vPIC VIN decoding API and WMI table.
 */
export const isValidVin = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const vin = value.trim().toUpperCase();

	if (vin.length !== VIN_LENGTH) return false;

	// Stryker disable next-line StringLiteral: generateChecksum strips this to digits, so it's inert.
	let translitDigits = "";

	for (let i = 0; i < VIN_LENGTH; i++) {
		const char = vin[i];

		if (!(char in VIN_TRANSLITERATION)) return false;

		translitDigits += VIN_TRANSLITERATION[char];
	}

	const checkDigit = vin[VIN_CHECK_DIGIT_POSITION];

	const remainder = generateChecksum({ base: translitDigits, weight: [...VIN_WEIGHTS] }) % 11;
	const expected = remainder === 10 ? "X" : String(remainder);

	return expected === checkDigit;
};
