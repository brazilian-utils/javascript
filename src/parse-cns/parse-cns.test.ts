import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCns } from "../format-cns/format-cns";
import { parseCns } from "./parse-cns";

describe("parseCns", () => {
	it("should remove CNS mask characters", () => {
		expect(parseCns("123 4567 8901 0000")).toBe("123456789010000");
	});

	it("should remove non numeric characters", () => {
		expect(parseCns("123.?ABC4567 8901-0000abc")).toBe("123456789010000");
	});

	it("should ignore digits after the CNS length", () => {
		expect(parseCns("123456789010000999")).toBe("123456789010000");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCns(123_456_789_010_000)).toBe("123456789010000");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCns(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CNS", () => {
			expectMatchesPattern(parseCns, /^\d{0,15}$/, anyText);
		});

		test("should undo formatCns", () => {
			expectRoundTrip(formatCns, parseCns, digitsUpTo(15));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCns, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCns, "string", anyValue);
		});
	});
});

describe("parseCns types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCns).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCns).returns.toEqualTypeOf<string>();
	});
});
