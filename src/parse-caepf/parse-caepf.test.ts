import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCaepf } from "../format-caepf/format-caepf";
import { parseCaepf } from "./parse-caepf";

describe("parseCaepf", () => {
	it("should remove CAEPF mask characters", () => {
		expect(parseCaepf("293.118.610/001-84")).toBe("29311861000184");
	});

	it("should remove non numeric characters", () => {
		expect(parseCaepf("293.?ABC118.610/001-84abc")).toBe("29311861000184");
	});

	it("should ignore digits after the CAEPF length", () => {
		expect(parseCaepf("29311861000184999")).toBe("29311861000184");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCaepf(29_311_861_000_184)).toBe("29311861000184");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCaepf(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CAEPF", () => {
			expectMatchesPattern(parseCaepf, /^\d{0,14}$/, anyText);
		});

		test("should undo formatCaepf", () => {
			expectRoundTrip(formatCaepf, parseCaepf, digitsUpTo(14));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCaepf, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCaepf, "string", anyValue);
		});
	});
});

describe("parseCaepf types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCaepf).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCaepf).returns.toEqualTypeOf<string>();
	});
});
