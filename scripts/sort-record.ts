/**
 * Returns the entries of a record sorted ascending by key, so that a generated constants table
 * is stable between runs and a dataset refresh diffs to what actually changed upstream. The
 * entries are rebuilt with `Object.fromEntries`, which defines every key as an own property: a
 * remote dataset that carries a `__proto__` key keeps it instead of losing it to the prototype.
 *
 * @param {Record<string, T>} data - The unsorted entries.
 * @returns {Record<string, T>} The same entries, in key order.
 */
export const sortRecord = <T>(data: Record<string, T>): Record<string, T> =>
	Object.fromEntries(Object.entries(data).sort(([left], [right]) => (left < right ? -1 : 1)));
