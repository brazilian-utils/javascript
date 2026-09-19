import * as fc from "fast-check";

import { CST_IBS_CBS_TABLE } from "../_internals/constants/ibs-cbs";
import { anyGarbage, digitsOfOtherLength } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCstIbsCbs } from "./is-valid-cst-ibs-cbs";

describe("isValidCstIbsCbs", () => {
	it("should validate the 18 codes of the CST table published on 23/06/2026", () => {
		const codes = [
			"000",
			"010",
			"011",
			"200",
			"220",
			"221",
			"222",
			"400",
			"410",
			"510",
			"515",
			"550",
			"620",
			"800",
			"810",
			"811",
			"820",
			"830",
		];

		expect(codes.filter((code) => isValidCstIbsCbs(code))).toEqual(codes);
	});

	it("should validate a code given as a number", () => {
		expect(isValidCstIbsCbs(200)).toBe(true);
		expect(isValidCstIbsCbs(830)).toBe(true);
	});

	it("should pad a value with leading zeros, as a number or as a string", () => {
		expect(isValidCstIbsCbs(0)).toBe(true);
		expect(isValidCstIbsCbs("0")).toBe(true);
		expect(isValidCstIbsCbs(10)).toBe(true);
		expect(isValidCstIbsCbs("11")).toBe(true);
	});

	it("should validate a code with surrounding whitespace", () => {
		expect(isValidCstIbsCbs(" 410 ")).toBe(true);
	});

	it("should keep CST 220 valid, which the CST table still lists after its classifications were excluded", () => {
		expect(isValidCstIbsCbs("220")).toBe(true);
	});

	it("should return false for a 3 digit code the table does not carry", () => {
		expect(isValidCstIbsCbs("100")).toBe(false);
		expect(isValidCstIbsCbs("999")).toBe(false);
		expect(isValidCstIbsCbs(20)).toBe(false);
	});

	it("should return false for an ICMS, IPI, PIS or COFINS CST", () => {
		expect(isValidCstIbsCbs("060")).toBe(false);
		expect(isValidCstIbsCbs("49")).toBe(false);
	});

	it("should return false for a wider value, a cClassTrib included", () => {
		expect(isValidCstIbsCbs("0000")).toBe(false);
		expect(isValidCstIbsCbs("200001")).toBe(false);
	});

	it("should return false for a string that is not bare digits", () => {
		expect(isValidCstIbsCbs("cst200")).toBe(false);
		expect(isValidCstIbsCbs("2.00")).toBe(false);
		expect(isValidCstIbsCbs("200\n1")).toBe(false);
		expect(isValidCstIbsCbs("")).toBe(false);
		expect(isValidCstIbsCbs("   ")).toBe(false);
	});

	it("should return false for a number that is not a non-negative safe integer", () => {
		expect(isValidCstIbsCbs(-200)).toBe(false);
		expect(isValidCstIbsCbs(20.5)).toBe(false);
		expect(isValidCstIbsCbs(2 ** 53)).toBe(false);
	});

	it("should return false for a value that is not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(isValidCstIbsCbs(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCstIbsCbs()).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCstIbsCbs(["200"])).toBe(false);
	});

	it("should return false for a key of the prototype chain", () => {
		expect(isValidCstIbsCbs("__proto__")).toBe(false);
		expect(isValidCstIbsCbs("constructor")).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CST_IBS_CBS_TABLE));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCstIbsCbs, anyGarbage);
		});

		test("should validate every code of the table, as a string or a number", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(isValidCstIbsCbs(code)).toBe(true);
					expect(isValidCstIbsCbs(Number(code))).toBe(true);
				}),
			);
		});

		test("should reject every digit string that is empty or wider than 3 digits", () => {
			fc.assert(
				fc.property(digitsOfOtherLength(12, [1, 2, 3]), (value) => {
					expect(isValidCstIbsCbs(value)).toBe(false);
				}),
			);
		});
	});
});

describe("isValidCstIbsCbs types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCstIbsCbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCstIbsCbs).returns.toEqualTypeOf<boolean>();
	});
});
