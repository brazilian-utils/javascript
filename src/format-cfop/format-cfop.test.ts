import { anyGarbage, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCfop, type FormatCfopOptions } from "./format-cfop";

describe("formatCfop", () => {
	it("should format a CFOP given as digits", () => {
		expect(formatCfop("5102")).toBe("5.102");
	});

	it("should format a CFOP given as a number", () => {
		expect(formatCfop(5102)).toBe("5.102");
	});

	it("should format a CFOP that already has the mask", () => {
		expect(formatCfop("5.102")).toBe("5.102");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatCfop("9999")).toBe("9.999");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatCfop("")).toBe("");
	});

	it("should mask a partial value progressively by default", () => {
		expect(formatCfop("5")).toBe("5");
		expect(formatCfop("51")).toBe("5.1");
		expect(formatCfop("510")).toBe("5.10");
		expect(formatCfop("5102")).toBe("5.102");
	});

	it("should mask a partial number progressively by default", () => {
		expect(formatCfop(51)).toBe("5.1");
	});

	it("should not add digits after the CFOP length", () => {
		expect(formatCfop("510299")).toBe("5.102");
	});

	describe("pad option", () => {
		it("should left pad a short code with zeros up to the full CFOP length", () => {
			expect(formatCfop("", { pad: true })).toBe("");
			expect(formatCfop("2", { pad: true })).toBe("0.002");
			expect(formatCfop("102", { pad: true })).toBe("0.102");
			expect(formatCfop("5102", { pad: true })).toBe("5.102");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatCfop(102, { pad: true })).toBe("0.102");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatCfop("51", { pad: false })).toBe("5.1");
		});
	});

	it("should return an empty string for null and undefined, even under pad", () => {
		// @ts-expect-error not a string or number
		expect(formatCfop(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCfop()).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCfop(null, { pad: true })).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCfop(undefined, { pad: true })).toBe("");
	});

	it("should read only the digits of a value with other characters, like formatCpf", () => {
		expect(formatCfop("abc5102")).toBe("5.102");
		expect(formatCfop("5-102")).toBe("5.102");
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(formatCfop(-5102)).toBe("");
		expect(formatCfop(51.02)).toBe("");
		expect(formatCfop(2 ** 53)).toBe("");
		expect(formatCfop(Number.MAX_VALUE)).toBe("");
		expect(formatCfop(1e21)).toBe("");
		expect(formatCfop(Number.NaN)).toBe("");
		expect(formatCfop(Number.POSITIVE_INFINITY)).toBe("");
		expect(formatCfop(Number.NEGATIVE_INFINITY)).toBe("");
		expect(formatCfop(-5102, { pad: true })).toBe("");
	});

	it("should return an empty string for a null-prototype object", () => {
		expect(formatCfop(Object.create(null))).toBe("");
	});

	describe("properties", () => {
		const fourDigits = digits(4);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCfop, anyGarbage);
		});

		test("should format every 4 digit value in the N.NNN pattern", () => {
			expectMatchesPattern(formatCfop, /^\d\.\d{3}$/, fourDigits);
		});

		test("should format every shorter value in the N.NNN pattern when padding", () => {
			expectMatchesPattern(
				(value) => formatCfop(value, { pad: true }),
				/^\d\.\d{3}$/,
				digitsUpTo(4).filter((value) => value !== ""),
			);
		});

		test("should be idempotent on a full 4 digit code", () => {
			expectIdempotent(formatCfop, fourDigits);
		});
	});
});

describe("formatCfop types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCfop).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCfop).parameter(1).toEqualTypeOf<FormatCfopOptions | undefined>();
		expectTypeOf(formatCfop).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCfopOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
