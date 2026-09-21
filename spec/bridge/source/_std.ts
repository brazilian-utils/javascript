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
	rows: string[][];
	groups: Record<string, number[]>;
	fullOrder: number[];
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
	JSON.parse(readFileSync(new URL(`${name}.data.json`, import.meta.url), "utf8")) as Dataset;

/**
 * Every row of a dataset, in the baked full order.
 *
 * The rows are the table's own: nothing reads them twice and nothing writes to them, which is
 * what lets every target hand out the same ones instead of copying 5,571 of them per call.
 *
 * @param {Dataset} table - The dataset.
 * @returns {string[][]} The rows.
 */
export const dataAll = (table: Dataset): string[][] =>
	table.fullOrder.map((index) => table.rows[index]);

/**
 * The rows of a dataset whose first column is the key given, in the baked per key order. An
 * unknown key, an inherited `Object` property name included, has no rows.
 *
 * @param {Dataset} table - The dataset.
 * @param {string} key - The value of the first column.
 * @returns {string[][]} The rows, empty when the key is unknown.
 */
export const dataRows = (table: Dataset, key: string): string[][] => {
	const group = Object.hasOwn(table.groups, key) ? table.groups[key] : [];

	return group.map((index) => table.rows[index]);
};

/** What a provider answered: the HTTP status, whether it counts as a success, and the body. */
export type HttpResponse = {
	/** The HTTP status, or `0` when the request never reached the server. */
	status: number;
	/** Whether the status is in the 2xx range. */
	ok: boolean;
	/** The decoded JSON body, read through the `json*` helpers. */
	body: unknown;
};

/**
 * Performs an HTTP GET, retrying a transient transport failure with a linear backoff.
 *
 * A request that never reached the server answers `status: 0`, so a transport failure and an
 * HTTP error are told apart the same way in every target. What "transient" means is the host's
 * own question, and each runtime answers it with its own client's error codes.
 *
 * The signature is synchronous on purpose: the author writes straight-line code, and the
 * emitters that need a coloured call graph, TypeScript and C#, add `async` and `await`
 * themselves.
 *
 * @param {string} url - The URL to read.
 * @param {number} retries - How many retries follow the first attempt.
 * @param {number} retryDelayMs - The base delay, multiplied by the attempt number.
 * @returns {HttpResponse} The response.
 */
export declare const httpGet: (url: string, retries: number, retryDelayMs: number) => HttpResponse;

/**
 * Whether the caller handed a number where a `string | number` was declared.
 *
 * Only the dynamically typed targets can answer anything but `false`: elsewhere the parameter
 * is a string and the question cannot arise.
 *
 * @param {string|number} value - The value.
 * @returns {boolean} True when it is a number.
 */
export const isNumber = (value: string | number): boolean => typeof value === "number";

/**
 * Whether a value is a list. Like `isNumber`, only the dynamically typed targets can answer
 * anything but `true`.
 *
 * @param {unknown} value - The value.
 * @returns {boolean} True when it is a list.
 */
export const isList = (value: unknown): boolean => Array.isArray(value);

/**
 * Whether a list holds a value.
 *
 * @param {string[]} list - The list.
 * @param {string} value - The value to look for.
 * @returns {boolean} True when the list holds it.
 */
export const listHas = (list: readonly string[], value: string): boolean => list.includes(value);

/** Reads one field of a JSON body, treating anything that is not an object as empty. */
const jsonField = (body: unknown, key: string): unknown => {
	if (body === null || typeof body !== "object" || Array.isArray(body)) return undefined;

	return Object.hasOwn(body, key) ? (body as Record<string, unknown>)[key] : undefined;
};

/**
 * Reads a string field of a JSON body, answering `""` when it is missing or not a string.
 *
 * @param {unknown} body - The body.
 * @param {string} key - The field name.
 * @returns {string} The value, or `""`.
 */
export const jsonString = (body: unknown, key: string): string => {
	const found = jsonField(body, key);

	return typeof found === "string" ? found : "";
};

/**
 * Reads an integer field of a JSON body, answering `-1` when it is missing or not a number.
 *
 * @param {unknown} body - The body.
 * @param {string} key - The field name.
 * @returns {number} The value, or `-1`.
 */
export const jsonInt = (body: unknown, key: string): number => {
	const found = jsonField(body, key);

	return typeof found === "number" ? Math.trunc(found) : -1;
};

/**
 * Whether a field of a JSON body is truthy, the way JavaScript reads truthiness.
 *
 * @param {unknown} body - The body.
 * @param {string} key - The field name.
 * @returns {boolean} True when the field is set and truthy.
 */
export const jsonTruthy = (body: unknown, key: string): boolean => Boolean(jsonField(body, key));

/**
 * Whether a field of a JSON body is exactly `true`, which is not the same question as truthy:
 * Widenet reports its own success with a boolean and a `1` there would not be one.
 *
 * @param {unknown} body - The body.
 * @param {string} key - The field name.
 * @returns {boolean} True when the field is the boolean `true`.
 */
export const jsonIsTrue = (body: unknown, key: string): boolean => jsonField(body, key) === true;

/** The running attempts of a race. What is inside is the runtime's business, not the source's. */
export type Attempts<T> = { readonly attempts: unique symbol; readonly of: T };

/**
 * Starts one attempt per item, all at once.
 *
 * This is the only concurrency primitive of the portable subset: the author never writes a
 * thread, a goroutine or a promise. Every target starts the work the way its own runtime does
 * — goroutines in Go, virtual threads in Java, tasks in C#, promises in TypeScript.
 *
 * @param {Function} run - The function to run per item.
 * @param {string[]} items - The items.
 * @param {string} argument - A second argument handed to every call.
 * @returns {Attempts} The running attempts.
 */
export declare const startAll: <T>(
	run: (item: never, argument: string) => T,
	items: readonly string[],
	argument: string,
) => Attempts<T>;

/**
 * The value of the first attempt that succeeds, or nothing once every attempt has failed.
 *
 * @param {Attempts} attempts - The running attempts.
 * @returns {unknown} The value, or `undefined`.
 */
export declare const firstSuccess: <T>(attempts: Attempts<T>) => T | undefined;

/**
 * Whether any attempt failed with a given error kind, the kinds it inherits from included.
 *
 * Only meaningful once `firstSuccess` has answered nothing, which is exactly when every attempt
 * has settled.
 *
 * @param {Attempts} attempts - The attempts.
 * @param {Function} kind - The error class to look for.
 * @returns {boolean} True when at least one attempt failed with it.
 */
export declare const anyFailedWith: <T>(
	attempts: Attempts<T>,
	kind: new (message: string) => Error,
) => boolean;
