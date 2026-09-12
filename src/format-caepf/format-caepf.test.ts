import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatCaepf, type FormatCaepfOptions } from "./format-caepf";

describe("formatCaepf", () => {
	test("should format a full 14 digit value", () => {
		expect(formatCaepf("29311861000184")).toBe("293.118.610/001-84");
	});

	test("should format a number input", () => {
		expect(formatCaepf(41_142_260_000_101)).toBe("411.422.600/001-01");
	});

	test("should format progressively as digits are typed", () => {
		expect(formatCaepf("2")).toBe("2");
		expect(formatCaepf("29")).toBe("29");
		expect(formatCaepf("293")).toBe("293");
		expect(formatCaepf("2931")).toBe("293.1");
		expect(formatCaepf("29311")).toBe("293.11");
		expect(formatCaepf("293118")).toBe("293.118");
	});

	test("should remove mask characters before formatting", () => {
		expect(formatCaepf("293.118.610/001-84")).toBe("293.118.610/001-84");
	});

	test("should truncate values longer than 14 digits", () => {
		expect(formatCaepf("293118610001840000")).toBe("293.118.610/001-84");
	});

	test("should pad the value with leading zeros when options.pad is true", () => {
		expect(formatCaepf("184", { pad: true })).toBe("000.000.000/001-84");
	});

	test("should not pad the value when options.pad is not given", () => {
		expect(formatCaepf("184")).toBe("184");
	});

	test("should return an empty string for an empty string", () => {
		expect(formatCaepf("")).toBe("");
	});

	test("should return an empty string for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCaepf(null)).toBe("");
	});

	test("should return an empty string for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCaepf()).toBe("");
	});

	describe("properties", () => {
		test("should print a full registration in the official mask", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{14}$/), (value) => {
					expect(/^\d{3}\.\d{3}\.\d{3}\/\d{3}-\d{2}$/.test(formatCaepf(value))).toBe(true);
				}),
			);
		});

		test("should keep only the digits of the registration it formats", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const digits = value.replaceAll(/\D/g, "").slice(0, 14);

					expect(formatCaepf(value).replaceAll(/\D/g, "")).toBe(digits);
				}),
			);
		});

		test("should never throw and always return the CAEPF number as a string", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), fc.integer(), (text, number) => {
					expect(typeof formatCaepf(text)).toBe("string");
					expect(typeof formatCaepf(number)).toBe("string");
				}),
			);
		});
	});
});

describe("formatCaepf types", () => {
	test("should take a string or number, optional options, and return a string", () => {
		expectTypeOf(formatCaepf).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCaepf).parameter(1).toEqualTypeOf<FormatCaepfOptions | undefined>();
		expectTypeOf<FormatCaepfOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(formatCaepf).returns.toEqualTypeOf<string>();
	});
});
