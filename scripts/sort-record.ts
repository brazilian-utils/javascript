/**
 * Returns the entries of a record sorted ascending by key, so that a generated constants table
 * is stable between runs and a dataset refresh diffs to what actually changed upstream.
 *
 * @param {Record<string, T>} data - The unsorted entries.
 * @returns {Record<string, T>} The same entries, in key order.
 */
export const sortRecord = <T>(data: Record<string, T>): Record<string, T> => {
	const sorted: Record<string, T> = {};

	for (const key of Object.keys(data).sort()) {
		sorted[key] = data[key];
	}

	return sorted;
};
