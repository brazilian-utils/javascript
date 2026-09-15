import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCei } from "../format-cei/format-cei";
import { parseCei } from "./parse-cei";

describe("parseCei", () => {
	it("should remove CEI mask characters", () => {
		expect(parseCei("27.729.71181/87")).toBe("277297118187");
	});

	it("should remove non numeric characters", () => {
		expect(parseCei("27.?ABC729.71181/87abc")).toBe("277297118187");
	});

	it("should ignore digits after the CEI length", () => {
		expect(parseCei("277297118187999")).toBe("277297118187");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCei(277_297_118_187)).toBe("277297118187");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCei(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CEI", () => {
			expectMatchesPattern(parseCei, /^\d{0,12}$/, anyText);
		});

		test("should undo formatCei", () => {
			expectRoundTrip(formatCei, parseCei, digitsUpTo(12));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCei, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCei, "string", anyValue);
		});
	});
});

describe("parseCei types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCei).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCei).returns.toEqualTypeOf<string>();
	});
});
