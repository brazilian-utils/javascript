import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatCei, type FormatCeiOptions } from "./format-cei";

describe("formatCei", () => {
	test("should format a full 12 digit value", () => {
		expect(formatCei("277297118187")).toBe("27.729.71181/87");
	});

	test("should format a number input", () => {
		expect(formatCei(249_859_674_386)).toBe("24.985.96743/86");
	});

	test("should format progressively as digits are typed", () => {
		expect(formatCei("2")).toBe("2");
		expect(formatCei("27")).toBe("27");
		expect(formatCei("277")).toBe("27.7");
		expect(formatCei("2772")).toBe("27.72");
		expect(formatCei("27729")).toBe("27.729");
		expect(formatCei("277297")).toBe("27.729.7");
	});

	test("should remove mask characters before formatting", () => {
		expect(formatCei("11.583.00249/85")).toBe("11.583.00249/85");
	});

	test("should truncate values longer than 12 digits", () => {
		expect(formatCei("2772971181870000")).toBe("27.729.71181/87");
	});

	test("should pad the value with leading zeros when options.pad is true", () => {
		expect(formatCei("249", { pad: true })).toBe("00.000.00002/49");
	});

	test("should return an empty string for an empty string", () => {
		expect(formatCei("")).toBe("");
	});

	test("should return an empty string for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCei(null)).toBe("");
	});

	test("should return an empty string for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCei()).toBe("");
	});

	describe("properties", () => {
		test("should print a full number in the official mask", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{12}$/), (value) => {
					expect(/^\d{2}\.\d{3}\.\d{5}\/\d{2}$/.test(formatCei(value))).toBe(true);
				}),
			);
		});

		test("should left pad a shorter value up to the CEI length", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{0,12}$/), (value) => {
					const padded = formatCei(value, { pad: true }).replaceAll(/\D/g, "");

					expect(padded).toBe(value.padStart(12, "0"));
				}),
			);
		});

		test("should never throw and always return the CEI number as a string", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), fc.integer(), (text, number) => {
					expect(typeof formatCei(text)).toBe("string");
					expect(typeof formatCei(number)).toBe("string");
				}),
			);
		});
	});
});

describe("formatCei types", () => {
	test("should take a string or number, optional options, and return a string", () => {
		expectTypeOf(formatCei).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCei).parameter(1).toEqualTypeOf<FormatCeiOptions | undefined>();
		expectTypeOf<FormatCeiOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(formatCei).returns.toEqualTypeOf<string>();
	});
});
