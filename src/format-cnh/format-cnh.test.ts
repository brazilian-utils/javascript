import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCnh } from "../parse-cnh/parse-cnh";
import { formatCnh, type FormatCnhOptions } from "./format-cnh";

describe("formatCnh", () => {
	it("should format CNH values", () => {
		expect(formatCnh("")).toBe("");
		expect(formatCnh("0")).toBe("0");
		expect(formatCnh("00")).toBe("00");
		expect(formatCnh("000")).toBe("000");
		expect(formatCnh("0000")).toBe("0000");
		expect(formatCnh("00000")).toBe("00000");
		expect(formatCnh("000000")).toBe("000000");
		expect(formatCnh("0000000")).toBe("0000000");
		expect(formatCnh("00000000")).toBe("00000000");
		expect(formatCnh("000000001")).toBe("000000001");
		expect(formatCnh("0000000011")).toBe("000000001-1");
		expect(formatCnh("00000000119")).toBe("000000001-19");
	});

	it("should remove non numeric characters", () => {
		expect(formatCnh("000.000.001-19")).toBe("000000001-19");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh()).toBe("");
	});

	describe("properties", () => {
		const upToACnh = digitsUpTo(11);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatCnh, parseCnh, upToACnh);
		});

		test("should produce the documented mask shape for a full CNH", () => {
			expectMatchesPattern(formatCnh, /^\d{9}-\d{2}$/, digits(11));
		});

		test("should left pad a shorter value up to the CNH length", () => {
			expectPadsToLength(formatCnh, parseCnh, upToACnh, 11);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatCnh, "string", anyValue);
		});
	});
});

describe("formatCnh types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCnh).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCnh).parameter(1).toEqualTypeOf<FormatCnhOptions | undefined>();
		expectTypeOf(formatCnh).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCnhOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
