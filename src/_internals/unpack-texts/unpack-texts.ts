const cache = new Map<string, readonly string[]>();

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
	const cached = cache.get(packed);

	// Stryker disable next-line ConditionalExpression: the cache only saves unpacking the texts again; the unpacked texts are the same on every read.
	if (cached !== undefined) return cached;

	let previous = "";
	const texts = packed.split("\n").map((line) => {
		previous = previous.slice(0, Number.parseInt(line.charAt(0), 36)) + line.slice(1);

		return previous;
	});

	// Stryker disable next-line CallExpression: the cache only saves unpacking the texts again; the unpacked texts are the same on every read.
	cache.set(packed, texts);

	return texts;
};
