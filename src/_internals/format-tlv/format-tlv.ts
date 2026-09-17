export type FormatTlvParams = {
	/** The two digit object ID. */
	id: string;
	/** The value of the object, whose length is written in front of it. */
	value: string;
};

const LENGTH_SEGMENT_LENGTH = 2;

/**
 * Serializes one EMV® style TLV (tag-length-value) object: the ID, the value length written as
 * two digits and the value itself.
 *
 * @param {FormatTlvParams} params - The object to serialize.
 * @param {string} params.id - The 2 digit object ID.
 * @param {string} params.value - The object value, at most 99 characters long.
 * @returns {string} The serialized object.
 *
 * @example
 * ```typescript
 * formatTlv({ id: "00", value: "01" }); // "000201"
 * formatTlv({ id: "58", value: "BR" }); // "5802BR"
 * ```
 */
export const formatTlv = ({ id, value }: FormatTlvParams): string =>
	`${id}${value.length.toString().padStart(LENGTH_SEGMENT_LENGTH, "0")}${value}`;
