import { anyGarbage, anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNbs, type FormatNbsOptions } from "./format-nbs";

describe("formatNbs", () => {
	it("should format an NBS code given as digits", () => {
		expect(formatNbs("101011100")).toBe("1.0101.11.00");
	});

	it("should format an NBS code given as a number", () => {
		expect(formatNbs(126_050_000)).toBe("1.2605.00.00");
	});

	it("should keep a code that already has the mask", () => {
		expect(formatNbs("1.0101.11.00")).toBe("1.0101.11.00");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatNbs("999999999")).toBe("9.9999.99.99");
	});

	it("should mask a partial value progressively", () => {
		expect(formatNbs("1")).toBe("1");
		expect(formatNbs("10")).toBe("1.0");
		expect(formatNbs("10101")).toBe("1.0101");
		expect(formatNbs("101011")).toBe("1.0101.1");
		expect(formatNbs("1010111")).toBe("1.0101.11");
		expect(formatNbs("10101110")).toBe("1.0101.11.0");
	});

	it("should drop the characters outside the mask and the digits after the ninth", () => {
		expect(formatNbs("abc101011100")).toBe("1.0101.11.00");
		expect(formatNbs("1010111009")).toBe("1.0101.11.00");
	});

	describe("pad option", () => {
		it("should left pad a short code with zeros up to the full NBS length", () => {
			expect(formatNbs("", { pad: true })).toBe("");
			expect(formatNbs("1", { pad: true })).toBe("0.0000.00.01");
			expect(formatNbs("10101", { pad: true })).toBe("0.0001.01.01");
			expect(formatNbs("101011100", { pad: true })).toBe("1.0101.11.00");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatNbs(1, { pad: true })).toBe("0.0000.00.01");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatNbs("10", { pad: false })).toBe("1.0");
		});

		it("should return an empty string for null and undefined, even under pad", () => {
			// @ts-expect-error not a string or number
			expect(formatNbs(null, { pad: true })).toBe("");
			// @ts-expect-error not a string or number
			expect(formatNbs(undefined, { pad: true })).toBe("");
			expect(formatNbs(-1, { pad: true })).toBe("");
		});
	});

	it("should return an empty string when there is no digit", () => {
		expect(formatNbs("")).toBe("");
		expect(formatNbs("abc")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatNbs(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatNbs()).toBe("");
	});

	describe("properties", () => {
		const nineDigits = digits(9);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatNbs, anyGarbage);
		});

		test("should always return a string", () => {
			expectAlwaysReturnsType(formatNbs, "string", anyValue);
		});

		test("should format every 9 digit value in the N.NNNN.NN.NN pattern", () => {
			expectMatchesPattern(formatNbs, /^\d\.\d{4}\.\d{2}\.\d{2}$/, nineDigits);
		});

		test("should format every shorter value in the N.NNNN.NN.NN pattern when padding", () => {
			expectMatchesPattern(
				(value) => formatNbs(value, { pad: true }),
				/^\d\.\d{4}\.\d{2}\.\d{2}$/,
				digitsUpTo(9).filter((value) => value !== ""),
			);
		});

		test("should be idempotent on a full 9 digit code", () => {
			expectIdempotent(formatNbs, nineDigits);
		});
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(formatNbs(-101_011_100)).toBe("");
		expect(formatNbs(-1)).toBe("");
		expect(formatNbs(1.5)).toBe("");
		expect(formatNbs(2 ** 53)).toBe("");
		expect(formatNbs(Number.MAX_VALUE)).toBe("");
		expect(formatNbs(1e21)).toBe("");
		expect(formatNbs(Number.NaN)).toBe("");
		expect(formatNbs(Number.POSITIVE_INFINITY)).toBe("");
		expect(formatNbs(Number.NEGATIVE_INFINITY)).toBe("");
	});
});

describe("formatNbs types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(formatNbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatNbs).parameter(1).toEqualTypeOf<FormatNbsOptions | undefined>();
		expectTypeOf(formatNbs).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatNbsOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
