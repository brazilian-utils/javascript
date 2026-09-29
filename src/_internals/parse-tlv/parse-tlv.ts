export type TlvFields = Record<string, string | undefined>;

const SEGMENT_LENGTH = 2;

const ZERO_CODE = 48;

const readTwoDigits = (value: string, index: number): number => {
	const tens = value.charCodeAt(index) - ZERO_CODE;
	const units = value.charCodeAt(index + 1) - ZERO_CODE;

	return tens >= 0 && tens <= 9 && units >= 0 && units <= 9 ? tens * 10 + units : -1;
};

/**
 * Parses an EMV® style TLV (tag-length-value) string into its objects.
 *
 * Every object is a 2 digit ID, a 2 digit length from `01` to `99` and a value of exactly that
 * many characters, laid out back to back. Parsing stops with `null` as soon as the string stops
 * being well-formed, i.e. when an ID or a length is not made of two digits, when a length is
 * `00`, when a value runs past the end of the string or when an ID appears twice: EMV gives each
 * object one ID per level, so a repeated ID is malformed rather than resolved to either value.
 *
 * @param {string} value - The TLV string to parse.
 * @returns {TlvFields|null} The objects keyed by ID, or `null` when the string is malformed.
 *
 * @example
 * ```typescript
 * parseTlv("0002015303986"); // { "00": "01", "53": "986" }
 * parseTlv("00020153039865802BR"); // { "00": "01", "53": "986", "58": "BR" }
 * parseTlv("0003ab"); // null, the value is shorter than its declared length
 * parseTlv("0000"); // null, a value has at least one character
 * parseTlv("0001A0001B"); // null, the ID 00 repeats
 * ```
 *
 * @see Official: https://www.emvco.com/terms-of-use/?u=/wp-content/uploads/documents/EMVCo-Merchant-Presented-QR-Specification-v1-1.pdf
 * EMV® QRCPS Merchant-Presented Mode v1.1, the one the Pix manual cites, "Data Organization":
 * "The length is coded as a two-digit
 * numeric value, with a value ranging from "01" to "99"" and "The value field has a minimum
 * length of one character and maximum length of 99 characters".
 */
export const parseTlv = (value: string): TlvFields | null => {
	const fields: TlvFields = {};

	let index = 0;

	while (index < value.length) {
		const length = readTwoDigits(value, index + SEGMENT_LENGTH);

		if (readTwoDigits(value, index) === -1 || length <= 0) return null;

		const id = value.slice(index, index + SEGMENT_LENGTH);

		if (Object.hasOwn(fields, id)) return null;

		const start = index + SEGMENT_LENGTH * 2;
		const end = start + length;

		if (end > value.length) return null;

		fields[id] = value.slice(start, end);
		index = end;
	}

	return fields;
};
