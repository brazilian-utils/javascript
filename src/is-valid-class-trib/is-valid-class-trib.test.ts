import * as fc from "fast-check";

import { CLASS_TRIB_CODES } from "../_internals/constants/ibs-cbs";
import { anyGarbage, digitsOfOtherLength } from "../_internals/test/arbitraries";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidClassTrib, type IsValidClassTribOptions } from "./is-valid-class-trib";

describe("isValidClassTrib", () => {
	it("should validate a known code, the first and the last of the table included", () => {
		expect(isValidClassTrib("000001")).toBe(true);
		expect(isValidClassTrib("200001")).toBe(true);
		expect(isValidClassTrib("410999")).toBe(true);
		expect(isValidClassTrib("830001")).toBe(true);
	});

	it("should validate a code given as a number", () => {
		expect(isValidClassTrib(200_001)).toBe(true);
	});

	it("should pad a value with leading zeros, as a number or as a string", () => {
		expect(isValidClassTrib(1)).toBe(true);
		expect(isValidClassTrib("1")).toBe(true);
		expect(isValidClassTrib(10_001)).toBe(true);
		expect(isValidClassTrib("11001")).toBe(true);
	});

	it("should validate a code with surrounding whitespace", () => {
		expect(isValidClassTrib(" 200001 ")).toBe(true);
	});

	it("should validate the codes Informe Técnico 2025.002 v.1.50 and v.1.60 created", () => {
		expect(isValidClassTrib("000005")).toBe(true);
		expect(isValidClassTrib("200054")).toBe(true);
		expect(isValidClassTrib("410036")).toBe(true);
		expect(isValidClassTrib("410037")).toBe(true);
		expect(isValidClassTrib("550024")).toBe(true);
		expect(isValidClassTrib("550025")).toBe(true);
		expect(isValidClassTrib("620007")).toBe(true);
		expect(isValidClassTrib("221002")).toBe(true);
		expect(isValidClassTrib("221003")).toBe(true);
		expect(isValidClassTrib("221004")).toBe(true);
	});

	it("should reject the classifications of CST 220 Informe Técnico 2025.002 v.1.60 excluded", () => {
		expect(isValidClassTrib("220001")).toBe(false);
		expect(isValidClassTrib("220002")).toBe(false);
		expect(isValidClassTrib("220003")).toBe(false);
	});

	it("should return false for a 6 digit code the table does not carry", () => {
		expect(isValidClassTrib("999999")).toBe(false);
		expect(isValidClassTrib("200000")).toBe(false);
		expect(isValidClassTrib("000000")).toBe(false);
		expect(isValidClassTrib(0)).toBe(false);
	});

	it("should return false for a value wider than 6 digits and for a CST alone", () => {
		expect(isValidClassTrib("2000010")).toBe(false);
		expect(isValidClassTrib("0200001")).toBe(false);
		expect(isValidClassTrib("200")).toBe(false);
	});

	it("should return false for a string that is not bare digits", () => {
		expect(isValidClassTrib("c200001")).toBe(false);
		expect(isValidClassTrib("200.001")).toBe(false);
		expect(isValidClassTrib("200 001")).toBe(false);
		expect(isValidClassTrib("")).toBe(false);
		expect(isValidClassTrib("      ")).toBe(false);
	});

	it("should return false for a number that is not a non-negative safe integer", () => {
		expect(isValidClassTrib(-200_001)).toBe(false);
		expect(isValidClassTrib(200_001.5)).toBe(false);
		expect(isValidClassTrib(2 ** 53)).toBe(false);
	});

	it("should return false for a value that is not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(isValidClassTrib(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidClassTrib()).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidClassTrib(["200001"])).toBe(false);
	});

	describe("options.cst", () => {
		it("should accept a classification together with the CST it belongs to", () => {
			expect(isValidClassTrib("200001", { cst: "200" })).toBe(true);
			expect(isValidClassTrib("410999", { cst: 410 })).toBe(true);
			expect(isValidClassTrib("620007", { cst: " 620 " })).toBe(true);
		});

		it("should pad the CST the way the code is padded", () => {
			expect(isValidClassTrib(1, { cst: 0 })).toBe(true);
			expect(isValidClassTrib("010001", { cst: 10 })).toBe(true);
			expect(isValidClassTrib("011001", { cst: "11" })).toBe(true);
		});

		it("should reject a classification together with another CST (rejection 1024)", () => {
			expect(isValidClassTrib("200001", { cst: "000" })).toBe(false);
			expect(isValidClassTrib("000001", { cst: "200" })).toBe(false);
			expect(isValidClassTrib("010001", { cst: "011" })).toBe(false);
		});

		it("should reject an unknown classification even when its first digits are the CST", () => {
			expect(isValidClassTrib("200999", { cst: "200" })).toBe(false);
			expect(isValidClassTrib("220001", { cst: "220" })).toBe(false);
		});

		it("should reject a CST that is not written as a code", () => {
			expect(isValidClassTrib("200001", { cst: "" })).toBe(false);
			expect(isValidClassTrib("200001", { cst: "2" })).toBe(false);
			expect(isValidClassTrib("200001", { cst: "200001" })).toBe(false);
			expect(isValidClassTrib("200001", { cst: "cst200" })).toBe(false);
			expect(isValidClassTrib("200001", { cst: -200 })).toBe(false);
		});

		it("should reject a CST that is not a string or a number", () => {
			// @ts-expect-error not a string or number
			expect(isValidClassTrib("200001", { cst: null })).toBe(false);
			// @ts-expect-error not a string or number
			expect(isValidClassTrib("200001", { cst: ["200"] })).toBe(false);
			// @ts-expect-error not a string or number
			expect(isValidClassTrib("200001", { cst: true })).toBe(false);
		});

		it("should check the cClassTrib alone when the CST is omitted", () => {
			expect(isValidClassTrib("200001", {})).toBe(true);
			expect(isValidClassTrib("200001", { cst: undefined })).toBe(true);
			expect(isValidClassTrib("999999", {})).toBe(false);
		});
	});

	it("should return false when options is not an object", () => {
		// @ts-expect-error not an options object
		expect(isValidClassTrib("200001", null)).toBe(false);
		// @ts-expect-error not an options object
		expect(isValidClassTrib("200001", "200")).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...CLASS_TRIB_CODES);

		test("should never throw, regardless of the input and the options", () => {
			expectNeverThrowsWithOptions(isValidClassTrib, anyGarbage, anyGarbage);
			expectNeverThrowsWithOptions(isValidClassTrib, codeArbitrary, fc.record({ cst: anyGarbage }));
		});

		test("should validate every code of the table, alone and with its first 3 digits as the CST", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(isValidClassTrib(code)).toBe(true);
					expect(isValidClassTrib(Number(code))).toBe(true);
					expect(isValidClassTrib(code, { cst: code.slice(0, 3) })).toBe(true);
				}),
			);
		});

		test("should reject every digit string that is empty or wider than 6 digits", () => {
			fc.assert(
				fc.property(digitsOfOtherLength(12, [1, 2, 3, 4, 5, 6]), (value) => {
					expect(isValidClassTrib(value)).toBe(false);
				}),
			);
		});
	});
});

describe("isValidClassTrib types", () => {
	test("should take a string or number plus options and return a boolean", () => {
		expectTypeOf(isValidClassTrib).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidClassTrib)
			.parameter(1)
			.toEqualTypeOf<IsValidClassTribOptions | undefined>();
		expectTypeOf(isValidClassTrib).returns.toEqualTypeOf<boolean>();
		expectTypeOf<IsValidClassTribOptions>().toEqualTypeOf<{ cst?: string | number }>();
	});
});
