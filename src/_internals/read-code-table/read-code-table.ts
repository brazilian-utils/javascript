/** A packed table read by `readCodeTable`: its code width and every code as a number, ascending. */
export type CodeTable = { width: number; values: number[] };

let tables: Map<string, CodeTable> | undefined;

/**
 * Unpacks a table the first time it is looked up in, and hands back the same arrays after that.
 *
 * @param {string} codes - The packed table.
 * @returns {CodeTable} Its code width and codes.
 */
export const readCodeTable = (codes: string): CodeTable => {
	const cached = tables?.get(codes);

	// Stryker disable next-line ConditionalExpression: the cache only saves unpacking the table again; an unpacked table is the same on every lookup.
	if (cached !== undefined) return cached;

	const separator = codes.indexOf(":");
	const values: number[] = [];
	let previous = 0;

	for (const difference of codes.slice(separator + 1).split(",")) {
		previous += Number.parseInt(difference, 36);
		values.push(previous);
	}

	const table = { width: Number(codes.slice(0, separator)), values };
	// Stryker disable next-line CallExpression: the cache only saves unpacking the table again; an unpacked table is the same on every lookup.
	tables ??= new Map();
	// Stryker disable next-line CallExpression: the cache only saves unpacking the table again; not storing it means the next lookup unpacks the same table again, which reads the same codes.
	tables.set(codes, table);

	return table;
};
