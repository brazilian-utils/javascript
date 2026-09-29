/**
 * Serializes a record as an object literal whose entries are written in ascending key order.
 * `JSON.stringify` follows the insertion order of the object, and JavaScript hoists the keys
 * that are canonical array indices (`"1001"`) ahead of the others (`"0101"`), so a record built
 * from sorted keys is not always emitted sorted. Writing the entries out in order keeps the
 * generated tables readable and their diffs small.
 *
 * @param {Record<string, unknown>} data - The entries to serialize.
 * @returns {string} The object literal, sorted by key.
 */
export const serializeRecord = (data: Record<string, unknown>): string =>
	`{${Object.keys(data)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${JSON.stringify(data[key])}`)
		.join(",")}}`;
