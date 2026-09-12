import * as fc from "fast-check";

import { CBO_TITLES } from "../_internals/constants/cbo";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCbo } from "./is-valid-cbo";

describe("isValidCbo", () => {
	it("should validate a CBO code without a mask", () => {
		expect(isValidCbo("212405")).toBe(true);
	});

	it("should validate a CBO code with the hyphen mask", () => {
		expect(isValidCbo("2124-05")).toBe(true);
	});

	it("should validate a CBO code given as a number", () => {
		expect(isValidCbo(212_405)).toBe(true);
	});

	it("should pad a number with leading zeros before looking it up", () => {
		expect(isValidCbo(10_205)).toBe(true);
		expect(isValidCbo("010205")).toBe(true);
		expect(isValidCbo("10205")).toBe(false);
	});

	it("should validate a CBO code with surrounding whitespace", () => {
		expect(isValidCbo(" 212405 ")).toBe(true);
	});

	it("should return false for an unknown six digit code", () => {
		expect(isValidCbo("000000")).toBe(false);
	});

	it("should return false when the digit count is not six", () => {
		expect(isValidCbo("21240")).toBe(false);
		expect(isValidCbo("2124055")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCbo("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCbo(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCbo()).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidCbo("      ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCbo("abcdef")).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CBO_TITLES));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCbo, anyGarbage);
		});

		test("should validate every known code, with or without the hyphen mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 4)}-${code.slice(4)}`;

					expect(isValidCbo(code)).toBe(true);
					expect(isValidCbo(masked)).toBe(true);
				}),
			);
		});
	});
});

describe("isValidCbo types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCbo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCbo).returns.toEqualTypeOf<boolean>();
	});
});
