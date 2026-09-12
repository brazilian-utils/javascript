import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseLegalNature } from "../parse-legal-nature/parse-legal-nature";
import { formatLegalNature } from "./format-legal-nature";

describe("formatLegalNature", () => {
	it("should format legal nature values", () => {
		expect(formatLegalNature("")).toBe("");
		expect(formatLegalNature("2")).toBe("2");
		expect(formatLegalNature("20")).toBe("20");
		expect(formatLegalNature("206")).toBe("206");
		expect(formatLegalNature("2062")).toBe("206-2");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatLegalNature(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatLegalNature()).toBe("");
	});

	describe("properties", () => {
		const upToACode = digitsUpTo(4);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatLegalNature, parseLegalNature, upToACode);
		});

		test("should produce the documented mask shape for a full code", () => {
			expectMatchesPattern(formatLegalNature, /^\d{3}-\d$/, digits(4));
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatLegalNature, "string", anyValue);
		});
	});
});

describe("formatLegalNature types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(formatLegalNature).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatLegalNature).returns.toEqualTypeOf<string>();
	});
});
