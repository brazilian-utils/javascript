import "./globals.d.ts";

type TestCallback = () => void | Promise<void>;

type Suite = {
	name: string;
	afterEach: TestCallback[];
	beforeEach: TestCallback[];
};

type MockImplementation = (...args: unknown[]) => unknown;

type MockFunction = ((...args: unknown[]) => unknown) & {
	mock: { calls: unknown[][] };
	mockClear: () => void;
	mockReset: () => void;
	mockRejectedValue: (value: unknown) => MockFunction;
	mockRejectedValueOnce: (value: unknown) => MockFunction;
	mockResolvedValue: (value: unknown) => MockFunction;
	mockResolvedValueOnce: (value: unknown) => MockFunction;
	mockImplementation: (implementation: MockImplementation) => MockFunction;
};

const registeredMocks = new Set<MockFunction>();
const suiteStack: Suite[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function hasLength(value: unknown): value is { length: number } {
	if (typeof value === "string" || Array.isArray(value)) {
		return true;
	}

	return isRecord(value) && typeof value["length"] === "number";
}

class AssertionMismatch extends Error {
	public constructor(message: string) {
		super(message);

		this.name = "AssertionMismatch";
	}
}

function createAssertionError(message: string): Error {
	return new AssertionMismatch(message);
}

function createUsageError(message: string): Error {
	return new TypeError(message);
}

function describeValue(value: unknown): string {
	if (!isRecord(value)) {
		return String(value);
	}

	try {
		return JSON.stringify(value) ?? Object.prototype.toString.call(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
}

type Pair = [unknown, unknown];
type SeenPairs = WeakMap<object, WeakSet<object>>;

function isObject(value: unknown): value is object {
	return typeof value === "object" && value !== null;
}

/**
 * Records the pair and reports whether it had been recorded before, so a cycle (an object that
 * references itself, or two objects that reference each other) is compared once instead of forever.
 */
function seenBefore(seen: SeenPairs, a: object, b: object): boolean {
	const partners = seen.get(a) ?? new WeakSet<object>();

	if (partners.has(b)) return true;

	partners.add(b);
	seen.set(a, partners);

	return false;
}

/**
 * Queues the element pairs of two arrays or the entry pairs of two records for comparison, or
 * reports that the two values can only be equal when `Object.is` says so (dates compare by time).
 */
function queuePairs(a: unknown, b: unknown, pending: Pair[]): boolean {
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let index = 0; index < a.length; index++) pending.push([a[index], b[index]]);
		return true;
	}

	if (isRecord(a) && isRecord(b)) {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);

		if (aKeys.length !== bKeys.length) return false;

		for (const key of aKeys) {
			if (!bKeys.includes(key)) return false;
			pending.push([a[key], b[key]]);
		}
		return true;
	}

	return false;
}

function deepEqual(left: unknown, right: unknown): boolean {
	const pending: Pair[] = [[left, right]];
	const seen: SeenPairs = new WeakMap();

	while (pending.length > 0) {
		const pair = pending.pop();

		if (pair === undefined) break;

		const [a, b] = pair;

		if (Object.is(a, b)) continue;
		if (isObject(a) && isObject(b) && seenBefore(seen, a, b)) continue;
		if (!queuePairs(a, b, pending)) return false;
	}

	return true;
}

function objectMatches(
	actual: Record<string, unknown>,
	expected: Record<string, unknown>,
): boolean {
	const pending: [Record<string, unknown>, Record<string, unknown>][] = [[actual, expected]];
	const seen: SeenPairs = new WeakMap();

	while (pending.length > 0) {
		const pair = pending.pop();

		if (pair === undefined) break;

		const [actualRecord, expectedRecord] = pair;

		if (seenBefore(seen, actualRecord, expectedRecord)) continue;

		for (const [key, value] of Object.entries(expectedRecord)) {
			if (!(key in actualRecord)) return false;

			const actualValue = actualRecord[key];

			if (isRecord(value) && isRecord(actualValue)) {
				pending.push([actualValue, value]);
			} else if (!deepEqual(actualValue, value)) {
				return false;
			}
		}
	}

	return true;
}

function createMock(implementation?: MockImplementation): MockFunction {
	const queue: MockImplementation[] = [];
	const calls: unknown[][] = [];
	let currentImplementation = implementation;

	const baseFn = (...args: unknown[]): unknown => {
		calls.push(args);

		if (queue.length > 0) {
			const nextImplementation = queue.shift();

			if (nextImplementation !== undefined) {
				return nextImplementation(...args);
			}
		}

		if (currentImplementation) {
			return currentImplementation(...args);
		}

		return undefined;
	};

	const mockFn: MockFunction = Object.assign(baseFn, {
		mock: { calls },
		mockClear: (): void => {
			calls.length = 0;
		},
		mockReset: (): void => {
			queue.length = 0;
			calls.length = 0;
			currentImplementation = implementation;
		},
		mockResolvedValueOnce: (value: unknown): MockFunction => {
			queue.push(() => Promise.resolve(value));

			return mockFn;
		},
		mockRejectedValueOnce: (value: unknown): MockFunction => {
			queue.push(async () => {
				await Promise.resolve();

				throw value;
			});

			return mockFn;
		},
		mockResolvedValue: (value: unknown): MockFunction => {
			currentImplementation = (): Promise<unknown> => Promise.resolve(value);

			return mockFn;
		},
		mockRejectedValue: (value: unknown): MockFunction => {
			currentImplementation = async (): Promise<unknown> => {
				await Promise.resolve();

				throw value;
			};

			return mockFn;
		},
		mockImplementation: (nextImplementation: MockImplementation): MockFunction => {
			currentImplementation = nextImplementation;

			return mockFn;
		},
	});

	registeredMocks.add(mockFn);

	return mockFn;
}

type ThrowExpectation = RegExp | string | Error | (new (...args: any[]) => unknown);

function assertThrown(error: unknown, expected?: ThrowExpectation): void {
	if (expected === undefined) {
		return;
	}

	const message = error instanceof Error ? error.message : String(error);

	if (expected instanceof RegExp) {
		if (!expected.test(message)) {
			throw createAssertionError(`Expected error message ${message} to match ${String(expected)}`);
		}

		return;
	}

	if (expected instanceof Error) {
		if (error !== expected && message !== expected.message) {
			throw createAssertionError(`Expected error to be ${expected.message}`);
		}

		return;
	}

	if (typeof expected === "function") {
		if (!(error instanceof expected)) {
			throw createAssertionError(`Expected error to be instance of ${expected.name}`);
		}

		return;
	}

	if (!message.includes(expected)) {
		throw createAssertionError(`Expected error message ${message} to contain ${expected}`);
	}
}

function isMockFunction(value: unknown): value is MockFunction {
	if (typeof value !== "function" || !("mock" in value)) {
		return false;
	}

	return isRecord(value.mock) && Array.isArray(value.mock["calls"]);
}

type Matcher = (...args: any[]) => void;

type Matchers = Record<string, Matcher>;

const isCallable = (value: unknown): value is (...args: unknown[]) => unknown =>
	typeof value === "function";

const createEqualityMatchers = (actual: unknown): Matchers => ({
	toBe(expected: unknown): void {
		if (!Object.is(actual, expected)) {
			throw createAssertionError(`Expected ${String(actual)} to be ${String(expected)}`);
		}
	},
	toEqual(expected: unknown): void {
		if (!deepEqual(actual, expected)) {
			throw createAssertionError("Expected values to be deeply equal");
		}
	},
	toStrictEqual(expected: unknown): void {
		if (!deepEqual(actual, expected)) {
			throw createAssertionError("Expected values to be strictly equal");
		}
	},
	toBeDefined(): void {
		if (actual === undefined || actual === null) {
			throw createAssertionError("Expected value to be defined");
		}
	},
	toBeUndefined(): void {
		if (actual !== undefined) {
			throw createAssertionError(`Expected ${describeValue(actual)} to be undefined`);
		}
	},
	toBeTruthy(): void {
		const isTruthy = Boolean(actual);

		if (isTruthy) return;

		throw createAssertionError(`Expected ${String(actual)} to be truthy`);
	},
	toBeNull(): void {
		if (actual !== null) {
			throw createAssertionError(`Expected ${describeValue(actual)} to be null`);
		}
	},
	toBeInstanceOf(expected: new (...args: any[]) => unknown): void {
		if (!(actual instanceof expected)) {
			throw createAssertionError(`Expected value to be instance of ${expected.name}`);
		}
	},
});

const createComparisonMatchers = (actual: unknown): Matchers => ({
	toBeGreaterThan(expected: number): void {
		if (!(typeof actual === "number" && actual > expected)) {
			throw createAssertionError(`Expected ${String(actual)} to be greater than ${expected}`);
		}
	},
	toBeGreaterThanOrEqual(expected: number): void {
		if (!(typeof actual === "number" && actual >= expected)) {
			throw createAssertionError(
				`Expected ${String(actual)} to be greater than or equal to ${expected}`,
			);
		}
	},
	toBeLessThanOrEqual(expected: number): void {
		if (!(typeof actual === "number" && actual <= expected)) {
			throw createAssertionError(
				`Expected ${String(actual)} to be less than or equal to ${expected}`,
			);
		}
	},
	toBeLessThan(expected: number): void {
		if (!(typeof actual === "number" && actual < expected)) {
			throw createAssertionError(`Expected ${String(actual)} to be less than ${expected}`);
		}
	},
});

const createCollectionMatchers = (actual: unknown): Matchers => ({
	toContain(expected: unknown): void {
		if (typeof actual === "string") {
			if (!actual.includes(String(expected))) {
				throw createAssertionError(`Expected ${actual} to contain ${String(expected)}`);
			}

			return;
		}

		if (!Array.isArray(actual) || !actual.includes(expected)) {
			throw createAssertionError(`Expected value to contain ${String(expected)}`);
		}
	},
	toMatch(expected: RegExp | string): void {
		if (typeof actual !== "string") {
			throw createUsageError("Expected value to be a string");
		}

		if (expected instanceof RegExp) {
			if (!expected.test(actual)) {
				throw createAssertionError(`Expected ${actual} to match ${String(expected)}`);
			}

			return;
		}

		if (!actual.includes(expected)) {
			throw createAssertionError(`Expected ${actual} to contain ${expected}`);
		}
	},
	toContainEqual(expected: unknown): void {
		if (!Array.isArray(actual)) {
			throw createUsageError("Expected value to be an array");
		}

		if (!actual.some((value) => deepEqual(value, expected))) {
			throw createAssertionError("Expected array to contain a deeply equal value");
		}
	},
	toHaveProperty(property: string): void {
		if (!isRecord(actual) || !(property in actual)) {
			throw createAssertionError(`Expected object to have property ${property}`);
		}
	},
	toHaveLength(expected: number): void {
		if (!hasLength(actual)) {
			throw createUsageError("Expected value to have a length");
		}

		if (actual.length !== expected) {
			throw createAssertionError(`Expected length ${actual.length} to be ${expected}`);
		}
	},
	toMatchObject(expected: Record<string, unknown>): void {
		if (!isRecord(actual) || !objectMatches(actual, expected)) {
			throw createAssertionError("Expected object to match");
		}
	},
});

const createBehaviorMatchers = (actual: unknown): Matchers => ({
	toThrow(expected?: ThrowExpectation): void {
		if (!isCallable(actual)) {
			throw createUsageError("Expected value to be a function");
		}

		try {
			actual();
		} catch (error) {
			assertThrown(error, expected);

			return;
		}

		throw createAssertionError("Expected function to throw");
	},
	toHaveBeenCalled(): void {
		if (!isMockFunction(actual)) {
			throw createUsageError("Expected value to be a mock function");
		}

		if (actual.mock.calls.length === 0) {
			throw createAssertionError("Expected mock function to have been called");
		}
	},
	toHaveBeenCalledTimes(expected: number): void {
		if (!isMockFunction(actual)) {
			throw createUsageError("Expected value to be a mock function");
		}

		if (actual.mock.calls.length !== expected) {
			throw createAssertionError(
				`Expected mock function to have been called ${expected} times, but it was called ${actual.mock.calls.length} times`,
			);
		}
	},
});

function createMatchers(actual?: unknown): Matchers {
	return {
		...createEqualityMatchers(actual),
		...createComparisonMatchers(actual),
		...createCollectionMatchers(actual),
		...createBehaviorMatchers(actual),
	};
}

type ExpectResult = Record<string, unknown> & {
	readonly not: Matchers;
	readonly resolves: Record<string, (...args: unknown[]) => Promise<unknown>>;
	readonly rejects: { toThrow: (expected?: ThrowExpectation) => Promise<void> };
};

function createExpect(actual: unknown): ExpectResult {
	const matchers = createMatchers(actual);

	return {
		...matchers,
		get not(): Matchers {
			return Object.fromEntries(
				Object.entries(matchers).map(([name, matcher]) => [
					name,
					(...args: unknown[]): void => {
						try {
							matcher(...args);
						} catch (error) {
							if (error instanceof AssertionMismatch) {
								return;
							}

							throw error;
						}

						throw createAssertionError(`Expected value not to satisfy ${name}`);
					},
				]),
			);
		},
		get resolves(): Record<string, (...args: unknown[]) => Promise<unknown>> {
			const promise = Promise.resolve(actual);

			return Object.fromEntries(
				Object.entries(createMatchers()).map(([name]) => [
					name,
					async (...args: unknown[]): Promise<unknown> => {
						const resolved = await promise;
						const resolvedMatchers = createMatchers(resolved);
						const matcherEntry = Object.entries(resolvedMatchers).find(
							([entryName]) => entryName === name,
						);
						const matcher = matcherEntry?.[1];

						return matcher?.(...args);
					},
				]),
			);
		},
		get rejects(): { toThrow: (expected?: ThrowExpectation) => Promise<void> } {
			return {
				async toThrow(expected?: ThrowExpectation): Promise<void> {
					try {
						await actual;
					} catch (error) {
						assertThrown(error, expected);

						return;
					}

					throw createAssertionError("Expected promise to reject");
				},
			};
		},
	};
}

async function runHooks(hooks: TestCallback[]): Promise<void> {
	for (const hook of hooks) {
		// eslint-disable-next-line no-await-in-loop
		await hook();
	}
}

function currentSuiteChain(): Suite[] {
	return [...suiteStack];
}

type DescribeFunction = ((name: string, callback: () => void) => void) & {
	skip: (name: string, callback: () => void) => void;
};

let skipDepth = 0;

const runSuite = (name: string, callback: () => void): void => {
	suiteStack.push({
		afterEach: [],
		beforeEach: [],
		name,
	});

	try {
		callback();
	} finally {
		suiteStack.pop();
	}
};

const describe: DescribeFunction = (name, callback): void => {
	runSuite(name, callback);
};

describe.skip = (name, callback): void => {
	skipDepth += 1;

	try {
		runSuite(name, callback);
	} finally {
		skipDepth -= 1;
	}
};

export function beforeEach(callback: TestCallback): void {
	const currentSuite = suiteStack.at(-1);

	if (!currentSuite) {
		throw new Error("beforeEach must be used inside describe");
	}

	currentSuite.beforeEach.push(callback);
}

export function afterEach(callback: TestCallback): void {
	const currentSuite = suiteStack.at(-1);

	if (!currentSuite) {
		throw new Error("afterEach must be used inside describe");
	}

	currentSuite.afterEach.push(callback);
}

export function it(name: string, callback: TestCallback, timeout?: number): void {
	const suites = currentSuiteChain();
	const testName = [...suites.map((suite) => suite.name), name].join(" > ");

	Deno.test({
		ignore: skipDepth > 0,
		fn: async () => {
			await runHooks(suites.flatMap((suite) => suite.beforeEach));

			try {
				await callback();
			} finally {
				await runHooks([...suites].reverse().flatMap((suite) => suite.afterEach));
			}
		},
		name: testName,
		sanitizeOps: false,
		sanitizeResources: false,
		...(timeout !== undefined && timeout !== 0 ? { sanitizeExit: false } : {}),
	});
}

export const test = it;

export const expect = createExpect;

export const vi = {
	fn: createMock,
	restoreAllMocks: (): void => {
		for (const mockFn of registeredMocks) {
			mockFn.mockReset();
		}
	},
};

export { describe };
export { bench, expectTypeOf } from "./noop";
