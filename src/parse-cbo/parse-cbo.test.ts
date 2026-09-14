import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCbo } from "./parse-cbo";

describe("parseCbo", () => {
	it("should remove CBO mask characters", () => {
		expect(parseCbo("2124-05")).toBe("212405");
	});

	it("should remove non numeric characters", () => {
		expect(parseCbo("21?ABC24-05abc")).toBe("212405");
	});

	it("should ignore digits after the CBO length", () => {
		expect(parseCbo("212405999")).toBe("212405");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCbo(212_405)).toBe("212405");
	});

	it("should keep a partial code as written, without padding it", () => {
		expect(parseCbo("10205")).toBe("10205");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCbo(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CBO code", () => {
			expectMatchesPattern(parseCbo, /^\d{0,6}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCbo, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCbo, "string", anyValue);
		});
	});
});

describe("parseCbo types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCbo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCbo).returns.toEqualTypeOf<string>();
	});
});
