export type TlvFields = Record<string, string | undefined>;

const SEGMENT_LENGTH = 2;

// Stryker disable next-line Regex: id and length are always sliced to at most SEGMENT_LENGTH (2) characters, so dropping either anchor cannot change whether this matches
const SEGMENT_REGEX = /^\d{2}$/;

/**
 * Parses an EMV® style TLV (tag-length-value) string into its objects.
 *
 * Every object is a 2 digit ID, a 2 digit length and a value of exactly that many characters,
 * laid out back to back. Parsing stops with `null` as soon as the string stops being
 * well-formed, i.e. when an ID or a length is not made of two digits or when a value runs past
 * the end of the string. Repeated IDs are not expected at the root of a BR Code; when they do
 * occur, the last one wins.
 *
 * @param {string} value - The TLV string to parse.
 * @returns {TlvFields|null} The objects keyed by ID, or `null` when the string is malformed.
 *
 * @example
 * ```typescript
 * parseTlv("0002015303986"); // { "00": "01", "53": "986" }
 * parseTlv("00020153039865802BR"); // { "00": "01", "53": "986", "58": "BR" }
 * parseTlv("0003ab"); // null, the value is shorter than its declared length
 * ```
 */
export const parseTlv = (value: string): TlvFields | null => {
	const fields: TlvFields = {};

	let index = 0;

	while (index < value.length) {
		const id = value.slice(index, index + SEGMENT_LENGTH);
		const length = value.slice(index + SEGMENT_LENGTH, index + SEGMENT_LENGTH * 2);

		if (!SEGMENT_REGEX.test(id) || !SEGMENT_REGEX.test(length)) return null;

		const start = index + SEGMENT_LENGTH * 2;
		const end = start + Number(length);

		if (end > value.length) return null;

		fields[id] = value.slice(start, end);
		index = end;
	}

	return fields;
};
