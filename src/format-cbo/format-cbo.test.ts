import { anyGarbage, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCbo, type FormatCboOptions } from "./format-cbo";

describe("formatCbo", () => {
	it("should format a CBO code given as digits", () => {
		expect(formatCbo("212405")).toBe("2124-05");
	});

	it("should format a CBO code given as a number", () => {
		expect(formatCbo(212_405)).toBe("2124-05");
	});

	it("should format a CBO code that already has the mask", () => {
		expect(formatCbo("2124-05")).toBe("2124-05");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatCbo("999999")).toBe("9999-99");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatCbo("")).toBe("");
	});

	it("should mask a partial value progressively by default", () => {
		expect(formatCbo("2")).toBe("2");
		expect(formatCbo("2124")).toBe("2124");
		expect(formatCbo("21240")).toBe("2124-0");
		expect(formatCbo("212405")).toBe("2124-05");
	});

	it("should mask a partial number progressively by default", () => {
		expect(formatCbo(21)).toBe("21");
		expect(formatCbo(10_205)).toBe("1020-5");
	});

	it("should not add digits after the CBO length", () => {
		expect(formatCbo("2124059999")).toBe("2124-05");
	});

	describe("pad option", () => {
		it("should left pad a short code with zeros up to the full CBO length", () => {
			expect(formatCbo("", { pad: true })).toBe("");
			expect(formatCbo("5", { pad: true })).toBe("0000-05");
			expect(formatCbo("10205", { pad: true })).toBe("0102-05");
			expect(formatCbo("212405", { pad: true })).toBe("2124-05");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatCbo(5, { pad: true })).toBe("0000-05");
			expect(formatCbo(10_205, { pad: true })).toBe("0102-05");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatCbo("10205", { pad: false })).toBe("1020-5");
		});
	});

	it("should return an empty string for null and undefined, even under pad", () => {
		// @ts-expect-error not a string or number
		expect(formatCbo(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCbo()).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCbo(null, { pad: true })).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCbo(undefined, { pad: true })).toBe("");
	});

	it("should read only the digits of a value with other characters, like formatCpf", () => {
		expect(formatCbo("abc212405")).toBe("2124-05");
		expect(formatCbo("21.24/05")).toBe("2124-05");
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(formatCbo(-212_405)).toBe("");
		expect(formatCbo(2124.05)).toBe("");
		expect(formatCbo(2 ** 53)).toBe("");
		expect(formatCbo(Number.MAX_VALUE)).toBe("");
		expect(formatCbo(1e21)).toBe("");
		expect(formatCbo(Number.NaN)).toBe("");
		expect(formatCbo(Number.POSITIVE_INFINITY)).toBe("");
		expect(formatCbo(Number.NEGATIVE_INFINITY)).toBe("");
		expect(formatCbo(-212_405, { pad: true })).toBe("");
	});

	it("should return an empty string for a null-prototype object", () => {
		expect(formatCbo(Object.create(null))).toBe("");
	});

	describe("properties", () => {
		const sixDigits = digits(6);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCbo, anyGarbage);
		});

		test("should format every 6 digit value in the NNNN-NN pattern", () => {
			expectMatchesPattern(formatCbo, /^\d{4}-\d{2}$/, sixDigits);
		});

		test("should format every shorter value in the NNNN-NN pattern when padding", () => {
			expectMatchesPattern(
				(value) => formatCbo(value, { pad: true }),
				/^\d{4}-\d{2}$/,
				digitsUpTo(6).filter((value) => value !== ""),
			);
		});

		test("should be idempotent on a full 6 digit code", () => {
			expectIdempotent(formatCbo, sixDigits);
		});
	});
});

describe("formatCbo types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCbo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCbo).parameter(1).toEqualTypeOf<FormatCboOptions | undefined>();
		expectTypeOf(formatCbo).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCboOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
