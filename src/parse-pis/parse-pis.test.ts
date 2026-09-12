import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parsePis } from "./parse-pis";

describe("parsePis", () => {
	it("should remove PIS mask characters", () => {
		expect(parsePis("123.45678.90-1")).toBe("12345678901");
	});

	it("should remove non numeric characters", () => {
		expect(parsePis("123#Error*&@#45678#Char!90-1")).toBe("12345678901");
	});

	it("should ignore digits after the PIS length", () => {
		expect(parsePis("12345678901123")).toBe("12345678901");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parsePis(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a PIS", () => {
			expectMatchesPattern(parsePis, /^\d{0,11}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parsePis, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parsePis, "string", anyValue);
		});
	});
});

describe("parsePis types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parsePis).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parsePis).returns.toEqualTypeOf<string>();
	});
});
