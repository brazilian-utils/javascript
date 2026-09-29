import { isLookupCode } from "../is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

const LEGAL_NATURE_FORMAT_REGEX = /^\d{3}[\s.\-/]*\d$/;

/**
 * Reads the 4 digits of a legal nature (natureza jurídica) code, or an empty string when the value
 * is not written as one.
 *
 * A code is the 4 digits, optionally split after the third by a run of mask characters
 * (whitespace, `.`, `-` or `/`), the way `formatLegalNature` prints it (`"206-2"`), with optional
 * surrounding whitespace. A separator anywhere else (`"2-0-6-2"`) is not part of a documented
 * form. A number is only read when it is a non-negative safe integer.
 *
 * @param {unknown} value - The value to read.
 * @returns {string} The 4 digits of the code, or `""` when the value is not written as a code.
 *
 * @example
 * ```typescript
 * readLegalNatureCode(" 206-2 "); // "2062"
 * readLegalNatureCode(2062); // "2062"
 * readLegalNatureCode("2-0-6-2"); // ""
 * readLegalNatureCode(-2062); // ""
 * ```
 */
export const readLegalNatureCode = (value: unknown): string => {
	if (!isLookupCode(value)) return "";

	const written = String(value).trim();

	return LEGAL_NATURE_FORMAT_REGEX.test(written) ? sanitizeToDigits(written) : "";
};
