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

/** What a provider answered: the HTTP status, whether it counts as a success, and the body. */
export type HttpResponse = {
	readonly status: number;
	readonly ok: boolean;
	readonly body: unknown;
};

/**
 * The transport failures worth retrying. `fetch` reports them on the error or on its cause,
 * and a failure that is not one of these is an answer, not a hiccup.
 */
const RETRYABLE_ERROR_CODES = new Set([
	"UND_ERR_SOCKET",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"ECONNRESET",
	"ECONNREFUSED",
	"EHOSTUNREACH",
	"ENETUNREACH",
	"ETIMEDOUT",
]);

/** The `code` of an error, or of its cause. */
const errorCode = (error: unknown): string | undefined => {
	if (error === null || typeof error !== "object") return undefined;

	const code = "code" in error ? error.code : undefined;

	if (typeof code === "string") return code;

	const cause = "cause" in error ? error.cause : undefined;

	if (cause === null || cause === undefined || typeof cause !== "object") return undefined;

	const causeCode = "code" in cause ? cause.code : undefined;

	return typeof causeCode === "string" ? causeCode : undefined;
};

/** Whether a `fetch` rejection is a transient transport failure. */
const isRetryable = (error: unknown): boolean => {
	const code = errorCode(error);

	if (code !== undefined && RETRYABLE_ERROR_CODES.has(code)) return true;
	if (!(error instanceof Error)) return false;

	return error.message.toLowerCase().includes("fetch failed");
};

/**
 * The origin every request is sent to instead of its own, when one is set.
 *
 * This is the conformance hook: the cross language replay points all seven targets at one local
 * server, the same way the JavaScript suite points `fetch` at a mock.
 */
const origin = (url: string): string => {
	const base = globalThis.process?.env?.["BRUTILS_BRIDGE_HTTP_ORIGIN"];

	if (base === undefined || base === "") return url;

	return `${base}/${url.replace(/^https?:\/\//, "")}`;
};

/**
 * Performs an HTTP GET, retrying a transient transport failure with a linear backoff.
 *
 * @param {string} url - The URL to read.
 * @param {number} retries - How many retries follow the first attempt.
 * @param {number} retryDelayMs - The base delay, multiplied by the attempt number.
 * @returns {Promise<HttpResponse>} The response; `status` is 0 when nothing reached the server.
 */
export const httpGet = async (
	url: string,
	retries: number,
	retryDelayMs: number,
): Promise<HttpResponse> => {
	const target = origin(url);

	for (let attempt = 0; ; attempt++) {
		try {
			const response = await fetch(target);
			let body: unknown;

			try {
				body = await response.json();
			} catch {
				body = undefined;
			}

			return { status: response.status, ok: response.ok, body };
		} catch (error) {
			if (attempt >= retries || !isRetryable(error))
				return { status: 0, ok: false, body: undefined };
		}

		const delay = retryDelayMs * (attempt + 1);

		await new Promise((resolve) => {
			setTimeout(resolve, delay);
		});
	}
};

/**
 * Whether the caller handed a number where a `string | number` was declared.
 *
 * @param {unknown} value - The value.
 * @returns {boolean} True when it is a number.
 */
export const isNumber = (value: unknown): boolean => typeof value === "number";

/**
 * Whether a value is a list.
 *
 * @param {unknown} value - The value.
 * @returns {boolean} True when it is a list.
 */
export const isList = (value: unknown): value is unknown[] => Array.isArray(value);

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
 * Whether a field of a JSON body is exactly `true`.
 *
 * @param {unknown} body - The body.
 * @param {string} key - The field name.
 * @returns {boolean} True when the field is the boolean `true`.
 */
export const jsonIsTrue = (body: unknown, key: string): boolean => jsonField(body, key) === true;

/** What one attempt of a race ended with. */
type Outcome<T> = { ok: boolean; value?: T; kinds: string[] };

/** The running attempts of a race, and what each one ended with. */
export type Attempts<T> = { settled: Promise<Outcome<T>>[]; outcomes: Outcome<T>[] };

/** The error name and every name it inherits from, which is what a failure is matched on. */
const kindsOf = (error: unknown): string[] => {
	const kinds: string[] = [];

	for (
		let current: unknown = error;
		current instanceof Error;
		current = Object.getPrototypeOf(current) as unknown
	) {
		const name = (current.constructor as { name?: string } | undefined)?.name;

		if (name !== undefined && name !== "" && !kinds.includes(name)) kinds.push(name);
	}

	return kinds;
};

/**
 * Starts one attempt per item, all at once.
 *
 * @param {Function} run - The function to run per item.
 * @param {string[]} items - The items.
 * @param {string} argument - A second argument handed to every call.
 * @returns {Attempts} The running attempts.
 */
export const startAll = <T>(
	run: (item: never, argument: string) => T | Promise<T>,
	items: readonly string[],
	argument: string,
): Attempts<T> => {
	const attempts: Attempts<T> = { settled: [], outcomes: [] };

	for (const item of items) {
		attempts.settled.push(
			Promise.resolve()
				.then(async (): Promise<Outcome<T>> => ({
					ok: true,
					value: await run(item as never, argument),
					kinds: [],
				}))
				.catch((error: unknown): Outcome<T> => ({ ok: false, kinds: kindsOf(error) }))
				.then((outcome) => {
					attempts.outcomes.push(outcome);

					return outcome;
				}),
		);
	}

	return attempts;
};

/**
 * The value of the first attempt that succeeds, or nothing once every attempt has failed.
 *
 * @param {Attempts} attempts - The running attempts.
 * @returns {Promise<unknown>} The value, or `undefined`.
 */
export const firstSuccess = async <T>(attempts: Attempts<T>): Promise<T | undefined> => {
	const waiting = new Map(
		attempts.settled.map((settled, index) => [
			index,
			settled.then((outcome) => ({ index, outcome })),
		]),
	);

	while (waiting.size > 0) {
		// The attempts are already running; this only picks whichever lands first.
		// eslint-disable-next-line no-await-in-loop
		const { index, outcome } = await Promise.race(waiting.values());

		waiting.delete(index);

		if (outcome.ok) return outcome.value;
	}

	return undefined;
};

/**
 * Whether any attempt failed with a given error kind.
 *
 * @param {Attempts} attempts - The attempts.
 * @param {string} kind - The error name to look for.
 * @returns {boolean} True when at least one attempt failed with it.
 */
export const anyFailedWith = <T>(attempts: Attempts<T>, kind: string): boolean =>
	attempts.outcomes.some((outcome) => !outcome.ok && outcome.kinds.includes(kind));
