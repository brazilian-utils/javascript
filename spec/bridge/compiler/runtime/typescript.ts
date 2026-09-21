/**
 * The portable runtime for the TypeScript target.
 *
 * Everything the generated code needs that is not plain syntax lives here: the compiled
 * character classes and patterns are passed in as data, so this file never changes when a
 * utility does.
 */

/** A character class: sorted, non overlapping code point ranges. */
export type CharClass = readonly (readonly [number, number])[];

/** One step of a compiled pattern: repeat a class between `min` and `max` times. */
export type PatternStep = {
	readonly charClass: CharClass;
	readonly min: number;
	readonly max: number;
	readonly capture: boolean;
};

/**
 * Whether a code point belongs to a class.
 *
 * @param {CharClass} charClass - The class to test against.
 * @param {number} code - The code point.
 * @returns {boolean} True when the class covers the code point.
 */
export const inClass = (charClass: CharClass, code: number): boolean => {
	for (const [from, to] of charClass) {
		if (code >= from && code <= to) return true;
	}

	return false;
};

/**
 * Reads one code unit, or -1 when the index is out of range.
 *
 * @param {string} value - The string to read.
 * @param {number} index - The index.
 * @returns {number} The code unit, or -1.
 */
export const codeAt = (value: string, index: number): number =>
	index >= 0 && index < value.length ? value.charCodeAt(index) : -1;

/**
 * Whether any character of the value belongs to the class.
 *
 * @param {CharClass} charClass - The class to look for.
 * @param {string} value - The string to scan.
 * @returns {boolean} True when at least one character matches.
 */
export const classHas = (charClass: CharClass, value: string): boolean => {
	for (let index = 0; index < value.length; index++) {
		if (inClass(charClass, value.charCodeAt(index))) return true;
	}

	return false;
};

/**
 * Keeps only the characters of the value that belong to the class.
 *
 * @param {CharClass} charClass - The class to keep.
 * @param {string} value - The string to filter.
 * @returns {string} The filtered string.
 */
export const keepClass = (charClass: CharClass, value: string): string => {
	let kept = "";

	for (let index = 0; index < value.length; index++) {
		if (inClass(charClass, value.charCodeAt(index))) kept += value.charAt(index);
	}

	return kept;
};

/**
 * Runs a compiled pattern against the whole value.
 *
 * The scan is greedy and never backtracks, which the compiler guarantees is correct by
 * refusing any pattern whose consecutive classes overlap.
 *
 * @param {PatternStep[]} steps - The compiled steps.
 * @param {string} value - The string to match.
 * @returns {boolean} True when the whole value matches.
 */
export const patternTest = (steps: readonly PatternStep[], value: string): boolean => {
	let index = 0;

	for (const step of steps) {
		let count = 0;

		while (
			(step.max < 0 || count < step.max) &&
			index < value.length &&
			inClass(step.charClass, value.charCodeAt(index))
		) {
			index++;
			count++;
		}

		if (count < step.min) return false;
	}

	return index === value.length;
};

/**
 * Left pads the value with a filler up to a length.
 *
 * @param {string} value - The value to pad.
 * @param {number} length - The target length.
 * @param {string} filler - The single character filler.
 * @returns {string} The padded value.
 */
export const padStart = (value: string, length: number, filler: string): string =>
	value.padStart(length, filler);

/**
 * Reads a value as a string the way `String(value)` does, answering `""` when the value has no
 * string conversion at all.
 *
 * @param {string|number} value - The value to read.
 * @returns {string} The string form.
 */
export const asString = (value: string | number): string => {
	try {
		return String(value);
	} catch {
		return "";
	}
};

/**
 * Reads an optional flag the way JavaScript reads truthiness.
 *
 * @param {boolean} [value] - The flag.
 * @returns {boolean} Whether the flag is set.
 */
export const isTruthy = (value?: boolean): boolean => Boolean(value);

/** A dataset: string rows, the row indexes grouped by the first column, and the full order. */
export type Dataset = {
	readonly all: string[][];
	readonly byKey: ReadonlyMap<string, string[][]>;
};

/**
 * Materialises a dataset, resolving both orders once.
 *
 * A `Map` rather than an object literal is what makes `dataRows(table, "toString")` answer with
 * no rows instead of an inherited property.
 *
 * @param {string[][]} rows - The table.
 * @param {Array} groups - The `[key, rowIndexes]` pairs.
 * @param {number[]} fullOrder - The order the rows are returned in when no key is given.
 * @returns {Dataset} The dataset.
 */
export const makeDataset = (
	rows: string[][],
	groups: [string, number[]][],
	fullOrder: number[],
): Dataset => ({
	all: fullOrder.map((index) => rows[index]),
	byKey: new Map(groups.map(([key, indexes]) => [key, indexes.map((index) => rows[index])])),
});

/**
 * Every row of a dataset, in the baked full order.
 *
 * @param {Dataset} table - The dataset.
 * @returns {string[][]} The rows.
 */
export const dataAll = (table: Dataset): string[][] => table.all;

/**
 * The rows whose first column is the key given, in the baked per key order.
 *
 * @param {Dataset} table - The dataset.
 * @param {string} key - The value of the first column.
 * @returns {string[][]} The rows, empty when the key is unknown.
 */
export const dataRows = (table: Dataset, key: string): string[][] => table.byKey.get(key) ?? [];
