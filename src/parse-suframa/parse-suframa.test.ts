import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseSuframa } from "./parse-suframa";

describe("parseSuframa", () => {
	it("should remove Inscrição SUFRAMA mask characters", () => {
		expect(parseSuframa("12.3456.789")).toBe("123456789");
		expect(parseSuframa("20.5678.10-6")).toBe("205678106");
	});

	it("should keep an unmasked value as it is", () => {
		expect(parseSuframa("123456789")).toBe("123456789");
		expect(parseSuframa("10001018")).toBe("10001018");
	});

	it("should accept a number", () => {
		expect(parseSuframa(123_456_789)).toBe("123456789");
	});

	it("should remove non numeric characters", () => {
		expect(parseSuframa("12#Error*&@#3456#Char!789")).toBe("123456789");
	});

	it("should ignore digits after the Inscrição SUFRAMA length", () => {
		expect(parseSuframa("123456789123")).toBe("123456789");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parseSuframa(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parseSuframa()).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of an Inscrição SUFRAMA", () => {
			expectMatchesPattern(parseSuframa, /^\d{0,9}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseSuframa, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseSuframa, "string", anyValue);
		});
	});
});

describe("parseSuframa types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseSuframa).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseSuframa).returns.toEqualTypeOf<string>();
	});
});
