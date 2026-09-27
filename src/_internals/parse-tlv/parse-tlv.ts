export type TlvFields = Record<string, string | undefined>;

const SEGMENT_LENGTH = 2;

// Stryker disable next-line Regex: id and length are always sliced to at most SEGMENT_LENGTH (2) characters, so dropping either anchor cannot change whether this matches
const SEGMENT_REGEX = /^\d{2}$/;

const EMPTY_LENGTH = "00";

/**
 * Parses an EMV® style TLV (tag-length-value) string into its objects.
 *
 * Every object is a 2 digit ID, a 2 digit length from `01` to `99` and a value of exactly that
 * many characters, laid out back to back. Parsing stops with `null` as soon as the string stops
 * being well-formed, i.e. when an ID or a length is not made of two digits, when a length is
 * `00` or when a value runs past the end of the string. Repeated IDs are not expected at the
 * root of a BR Code; when they do occur, the last one wins.
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
		const id = value.slice(index, index + SEGMENT_LENGTH);
		const length = value.slice(index + SEGMENT_LENGTH, index + SEGMENT_LENGTH * 2);

		if (!SEGMENT_REGEX.test(id) || !SEGMENT_REGEX.test(length) || length === EMPTY_LENGTH)
			return null;

		const start = index + SEGMENT_LENGTH * 2;
		const end = start + Number(length);

		if (end > value.length) return null;

		fields[id] = value.slice(start, end);
		index = end;
	}

	return fields;
};
