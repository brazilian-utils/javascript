import * as fc from "fast-check";

import { expect } from "./runtime";

type UnknownInputFunction = (value: never) => unknown;

/**
 * Asserts the util never throws, whatever the arbitrary produces.
 * @param {UnknownInputFunction} fn The util under test.
 * @param {fc.Arbitrary<unknown>} arbitrary The values to feed it.
 * @returns {void} Nothing.
 */
export const expectNeverThrows = (
	fn: UnknownInputFunction,
	arbitrary: fc.Arbitrary<unknown>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(() => fn(value as never)).not.toThrow();
		}),
	);
};

/**
 * Asserts the util never throws for any pair of value and options the arbitraries produce.
 * @param {Function} fn The util under test.
 * @param {fc.Arbitrary<unknown>} values The values to feed it.
 * @param {fc.Arbitrary<unknown>} options The options to feed it.
 * @returns {void} Nothing.
 */
export const expectNeverThrowsWithOptions = (
	fn: (value: never, options: never) => unknown,
	values: fc.Arbitrary<unknown>,
	options: fc.Arbitrary<unknown>,
): void => {
	fc.assert(
		fc.property(values, options, (value, currentOptions) => {
			expect(() => fn(value as never, currentOptions as never)).not.toThrow();
		}),
	);
};

/**
 * Asserts the util always returns a value of `expectedType`, whatever the arbitrary produces.
 * @param {UnknownInputFunction} fn The util under test.
 * @param {string} expectedType The `typeof` the util is expected to return.
 * @param {fc.Arbitrary<unknown>} arbitrary The values to feed it.
 * @returns {void} Nothing.
 */
export const expectAlwaysReturnsType = (
	fn: UnknownInputFunction,
	expectedType: "boolean" | "number" | "string",
	arbitrary: fc.Arbitrary<unknown>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(typeof fn(value as never)).toBe(expectedType);
		}),
	);
};

/**
 * Asserts the validator answers `verdict` for every value the arbitrary produces.
 * @param {Function} fn The validator under test.
 * @param {fc.Arbitrary<string>} arbitrary The values to feed it.
 * @param {boolean} verdict The answer it must give.
 * @returns {void} Nothing.
 */
const expectVerdict = (
	fn: (value: string) => boolean,
	arbitrary: fc.Arbitrary<string>,
	verdict: boolean,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(fn(value)).toBe(verdict);
		}),
	);
};

/**
 * Asserts the validator accepts every value the arbitrary produces.
 * @param {Function} fn The validator under test.
 * @param {fc.Arbitrary<string>} arbitrary The values it must accept.
 * @returns {void} Nothing.
 */
export const expectAccepted = (
	fn: (value: string) => boolean,
	arbitrary: fc.Arbitrary<string>,
): void => {
	expectVerdict(fn, arbitrary, true);
};

/**
 * Asserts the validator rejects every value the arbitrary produces.
 * @param {Function} fn The validator under test.
 * @param {fc.Arbitrary<string>} arbitrary The values it must reject.
 * @returns {void} Nothing.
 */
export const expectRejected = (
	fn: (value: string) => boolean,
	arbitrary: fc.Arbitrary<string>,
): void => {
	expectVerdict(fn, arbitrary, false);
};

/**
 * Asserts the util's output always matches `pattern`.
 * @param {Function} fn The util under test.
 * @param {RegExp} pattern The shape the output must have.
 * @param {fc.Arbitrary<string>} arbitrary The values to feed it.
 * @returns {void} Nothing.
 */
export const expectMatchesPattern = (
	fn: (value: string) => string,
	pattern: RegExp,
	arbitrary: fc.Arbitrary<string>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(fn(value)).toMatch(pattern);
		}),
	);
};

/**
 * Asserts applying the util twice gives the same result as applying it once.
 * @param {Function} fn The util under test.
 * @param {fc.Arbitrary<string>} arbitrary The values to feed it.
 * @returns {void} Nothing.
 */
export const expectIdempotent = (
	fn: (value: string) => string,
	arbitrary: fc.Arbitrary<string>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			const once = fn(value);

			expect(fn(once)).toBe(once);
		}),
	);
};

/**
 * Asserts the util treats an uppercased value exactly like the value it was given.
 * @param {Function} fn The util under test.
 * @param {fc.Arbitrary<string>} arbitrary The values to feed it.
 * @returns {void} Nothing.
 */
export const expectCaseInsensitive = (
	fn: (value: string) => string,
	arbitrary: fc.Arbitrary<string>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(fn(value.toUpperCase())).toBe(fn(value));
		}),
	);
};

/**
 * Asserts `parse` undoes `format` for every value the arbitrary produces.
 * @param {Function} format The formatter under test.
 * @param {Function} parse The parser that must undo it.
 * @param {fc.Arbitrary<T>} arbitrary The values to feed them.
 * @returns {void} Nothing.
 */
export const expectRoundTrip = <T>(
	format: (value: T) => string,
	parse: (value: string) => T,
	arbitrary: fc.Arbitrary<T>,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			expect(parse(format(value))).toBe(value);
		}),
	);
};

/**
 * Asserts the formatter left pads a shorter value with zeros up to `length` when asked to.
 * @param {Function} format The formatter under test.
 * @param {Function} parse The parser that strips the mask back off.
 * @param {fc.Arbitrary<string>} arbitrary The values to feed them.
 * @param {number} length The length the padded value must reach.
 * @returns {void} Nothing.
 */
export const expectPadsToLength = (
	format: (value: string, options: { pad: boolean }) => string,
	parse: (value: string) => string,
	arbitrary: fc.Arbitrary<string>,
	length: number,
): void => {
	fc.assert(
		fc.property(arbitrary, (value) => {
			const padded = format(value, { pad: true });

			expect(parse(padded)).toBe(value.padStart(length, "0"));
		}),
	);
};
