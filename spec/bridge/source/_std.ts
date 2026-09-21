/**
 * The portable standard library.
 *
 * These are the few operations whose behaviour the bridge pins itself instead of inheriting
 * from the host: every target implements them identically. The implementations here are the
 * reference, and are what runs when the source is executed directly as TypeScript.
 */
import { readFileSync } from "node:fs";

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
 * Reads an optional flag the way JavaScript reads truthiness, so a caller passing `1` where a
 * boolean was declared gets the same answer everywhere.
 *
 * @param {boolean} [value] - The flag.
 * @returns {boolean} Whether the flag is set.
 */
export const isTruthy = (value?: boolean): boolean => Boolean(value);

/**
 * A dataset: a table of string rows, the row indexes grouped by the value of the first column,
 * and the order the rows are returned in when no key is given.
 *
 * Both orders are resolved at build time by `data/build.ts`, never at run time, because
 * locale aware comparison is the one thing the seven targets cannot agree on.
 */
export type Dataset = {
	rows: readonly (readonly string[])[];
	groups: Readonly<Record<string, readonly number[]>>;
	fullOrder: readonly number[];
};

/**
 * Binds a dataset built by `data/build.ts`. Only valid at module level, as a `const`.
 *
 * @param {string} name - The dataset name, which is the JSON file's basename.
 * @returns {Dataset} The dataset.
 */
export const dataset = (name: string): Dataset =>
	// The compiler replaces every call with the table itself; this body only runs when the
	// portable source is executed directly, which the conformance harness never does.
	JSON.parse(
		readFileSync(new URL(`./${name}.data.json`, import.meta.url), "utf8"),
	) as Dataset;

/**
 * Every row of a dataset, in the baked full order.
 *
 * @param {Dataset} table - The dataset.
 * @returns {string[][]} The rows.
 */
export const dataAll = (table: Dataset): string[][] =>
	table.fullOrder.map((index) => [...table.rows[index]]);

/**
 * The rows of a dataset whose first column is the key given, in the baked per key order. An
 * unknown key, an inherited `Object` property name included, has no rows.
 *
 * @param {Dataset} table - The dataset.
 * @param {string} key - The value of the first column.
 * @returns {string[][]} The rows, empty when the key is unknown.
 */
export const dataRows = (table: Dataset, key: string): string[][] =>
	(Object.hasOwn(table.groups, key) ? table.groups[key] : []).map((index) => [
		...table.rows[index],
	]);
