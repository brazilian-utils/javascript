import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseLegalNature } from "./parse-legal-nature";

describe("parseLegalNature", () => {
	it("should remove legal nature formatting", () => {
		expect(parseLegalNature("206-2")).toBe("2062");
	});

	it("should ignore digits after the legal nature length", () => {
		expect(parseLegalNature("206299")).toBe("2062");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseLegalNature(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a legal nature code", () => {
			expectMatchesPattern(parseLegalNature, /^\d{0,4}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseLegalNature, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseLegalNature, "string", anyValue);
		});
	});
});

describe("parseLegalNature types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseLegalNature).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseLegalNature).returns.toEqualTypeOf<string>();
	});
});
