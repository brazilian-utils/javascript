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

function createAssertionError(message: string): Error {
	return new Error(message);
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

function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((value, index) => deepEqual(value, b[index]));
	}

	if (isRecord(a) && isRecord(b)) {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);

		return (
			aKeys.length === bKeys.length &&
			aKeys.every((key) => bKeys.includes(key) && deepEqual(a[key], b[key]))
		);
	}

	return false;
}

function objectMatches(
	actual: Record<string, unknown>,
	expected: Record<string, unknown>,
): boolean {
	return Object.entries(expected).every(([key, value]) => {
		if (!(key in actual)) {
			return false;
		}

		const actualValue = actual[key];

		if (isRecord(value) && isRecord(actualValue)) {
			return objectMatches(actualValue, value);
		}

		return deepEqual(actualValue, value);
	});
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
			queue.length = 0;
			calls.length = 0;
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
			throw createAssertionError("Expected value to be a string");
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
			throw createAssertionError("Expected value to be an array");
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
			throw createAssertionError("Expected value to have a length");
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
			throw createAssertionError("Expected value to be a function");
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
			throw createAssertionError("Expected value to be a mock function");
		}

		if (actual.mock.calls.length === 0) {
			throw createAssertionError("Expected mock function to have been called");
		}
	},
	toHaveBeenCalledTimes(expected: number): void {
		if (!isMockFunction(actual)) {
			throw createAssertionError("Expected value to be a mock function");
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
							matcher.apply(undefined, args);
						} catch {
							return;
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

						return matcher?.apply(undefined, args);
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
	const [hook, ...rest] = hooks;

	if (hook === undefined) return;

	await hook();
	await runHooks(rest);
}

function currentSuiteChain(): Suite[] {
	return [...suiteStack];
}

type DescribeFunction = ((name: string, callback: TestCallback) => void) & {
	skip: (name: string, callback: TestCallback) => void;
};

let skipDepth = 0;

const runSuite = (name: string, callback: TestCallback): void => {
	suiteStack.push({
		afterEach: [],
		beforeEach: [],
		name,
	});

	try {
		Promise.resolve(callback()).catch((error: unknown) => {
			throw error;
		});
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
			mockFn.mockClear();
		}
	},
};

export { describe };
