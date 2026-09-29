let cache: Map<string, readonly string[]> | undefined;

const unpack = (packed: string): readonly string[] => {
	let previous = "";

	return packed.split("\n").map((line) => {
		previous = previous.slice(0, Number.parseInt(line.charAt(0), 36)) + line.slice(1);

		return previous;
	});
};

const store = (texts: Map<string, readonly string[]>, packed: string): readonly string[] => {
	const unpacked = unpack(packed);

	texts.set(packed, unpacked);

	return unpacked;
};

/**
 * Unpacks a list of texts the generator packed (`packTexts` in `scripts/lookup-table.ts`): one
 * text per line, each written as the number of leading characters it shares with the text before
 * it, in base 36 (`0` for the first), then the rest of it. Neighbouring descriptions of a table
 * often start alike, so the shared start is written once. The list is unpacked on its first read
 * and the same array is handed back after that, so a caller must not change it.
 *
 * @param {string} packed - The packed texts.
 * @returns {readonly string[]} The texts, in their original order.
 *
 * @example
 * ```typescript
 * unpackTexts("0Cólera\n6 devida\n0Febre"); // ["Cólera", "Cólera devida", "Febre"]
 * ```
 */
export const unpackTexts = (packed: string): readonly string[] => {
	cache ??= new Map();

	return cache.get(packed) ?? store(cache, packed);
};
