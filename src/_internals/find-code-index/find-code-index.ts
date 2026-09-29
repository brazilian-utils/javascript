/** A packed table read by `readTable`: its code width and every code as a number, ascending. */
type CodeTable = { width: number; values: number[] };

const tables = new Map<string, CodeTable>();

/**
 * Unpacks a table the first time it is looked up in, and hands back the same arrays after that.
 *
 * @param {string} codes - The packed table.
 * @returns {CodeTable} Its code width and codes.
 */
const readTable = (codes: string): CodeTable => {
	const cached = tables.get(codes);

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
	tables.set(codes, table);

	return table;
};

/**
 * Finds a code in a lookup table packed by the generator (`packCodes` in
 * `scripts/lookup-table.ts`): the code width, a colon, then each code as its difference from the
 * one before it, in base 36 and separated by commas (`"3:1,2,1"` holds `"001"`, `"003"` and
 * `"004"`). A validator bundles that string alone, and a getter reads the description at the same
 * index of the aligned descriptions array, which only the getter bundles. The table is unpacked
 * once, on its first lookup, and searched by bisection.
 *
 * Only a code of exactly the table width, digits only, can be found.
 *
 * @param {string} codes - The packed table.
 * @param {string} code - The code to look for, already normalized to the width of the table.
 * @returns {number} The index of the code in the table, `-1` when it is not listed.
 *
 * @example
 * ```typescript
 * findCodeIndex("3:1,2,1", "003"); // 1
 * findCodeIndex("3:1,2,1", "002"); // -1
 * findCodeIndex("3:1,2,1", "03"); // -1, not 3 digits
 * ```
 */
export const findCodeIndex = (codes: string, code: string): number => {
	const { width, values } = readTable(codes);

	if (code.length !== width || !/^\d+$/.test(code)) return -1;

	const value = Number(code);
	let low = 0;
	let high = values.length;

	// A bisection over the ascending codes: the first index whose code is not below `value`.
	while (low < high) {
		const middle = (low + high) >>> 1;

		if (values[middle] < value) low = middle + 1;
		else high = middle;
	}

	return values[low] === value ? low : -1;
};
