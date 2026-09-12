import * as fc from "fast-check";

import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { CSOSN_CODES } from "./constants";
import { isValidCsosn } from "./is-valid-csosn";

describe("isValidCsosn", () => {
	it("should return true for every known CSOSN code", () => {
		for (const code of CSOSN_CODES) {
			expect(isValidCsosn(code)).toBe(true);
		}
	});

	it("should return true for a number input", () => {
		expect(isValidCsosn(101)).toBe(true);
	});

	it("should return true with surrounding whitespace", () => {
		expect(isValidCsosn(" 101 ")).toBe(true);
	});

	it("should return false for an unknown 3 digit code", () => {
		expect(isValidCsosn("999")).toBe(false);
	});

	it("should return false for a length different from 3", () => {
		expect(isValidCsosn("10")).toBe(false);
		expect(isValidCsosn("1010")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCsosn("")).toBe(false);
	});

	it("should return false for null", () => {
		// @ts-expect-error not a string or number
		expect(isValidCsosn(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCsosn()).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCsosn("abc")).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...CSOSN_CODES);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCsosn, anyGarbage);
		});

		test("should validate every known code, as a string or a number", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(isValidCsosn(code)).toBe(true);
					expect(isValidCsosn(Number(code))).toBe(true);
				}),
			);
		});
	});
});

describe("isValidCsosn types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCsosn).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCsosn).returns.toEqualTypeOf<boolean>();
	});
});
