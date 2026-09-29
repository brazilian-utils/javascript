/** A packed table read by `readCodeTable`: its code width and every code as a number, ascending. */
export type CodeTable = { width: number; values: number[] };

let tables: Map<string, CodeTable> | undefined;

const unpack = (codes: string): CodeTable => {
	const separator = codes.indexOf(":");
	const values: number[] = [];
	let previous = 0;

	for (const difference of codes.slice(separator + 1).split(",")) {
		previous += Number.parseInt(difference, 36);
		values.push(previous);
	}

	return { width: Number(codes.slice(0, separator)), values };
};

const store = (cache: Map<string, CodeTable>, codes: string): CodeTable => {
	const table = unpack(codes);

	cache.set(codes, table);

	return table;
};

/**
 * Unpacks a table the first time it is looked up in, and hands back the same arrays after that.
 *
 * @param {string} codes - The packed table.
 * @returns {CodeTable} Its code width and codes.
 */
export const readCodeTable = (codes: string): CodeTable => {
	tables ??= new Map();

	return tables.get(codes) ?? store(tables, codes);
};
