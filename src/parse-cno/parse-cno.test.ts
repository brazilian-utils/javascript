import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCno } from "../format-cno/format-cno";
import { parseCno } from "./parse-cno";

describe("parseCno", () => {
	it("should remove CNO mask characters", () => {
		expect(parseCno("11.113.01373/68")).toBe("111130137368");
	});

	it("should remove non numeric characters", () => {
		expect(parseCno("11.?ABC113.01373/68abc")).toBe("111130137368");
	});

	it("should ignore digits after the CNO length", () => {
		expect(parseCno("111130137368999")).toBe("111130137368");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCno(111_130_137_368)).toBe("111130137368");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCno(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CNO", () => {
			expectMatchesPattern(parseCno, /^\d{0,12}$/, anyText);
		});

		test("should undo formatCno", () => {
			expectRoundTrip(formatCno, parseCno, digitsUpTo(12));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCno, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCno, "string", anyValue);
		});
	});
});

describe("parseCno types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCno).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCno).returns.toEqualTypeOf<string>();
	});
});
