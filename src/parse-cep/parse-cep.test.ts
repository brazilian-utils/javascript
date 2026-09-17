import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCep } from "./parse-cep";

describe("parseCep", () => {
	it("should remove CEP mask characters", () => {
		expect(parseCep("01001-000")).toBe("01001000");
	});

	it("should remove non numeric characters", () => {
		expect(parseCep("a0.10cr01?00#ab0")).toBe("01001000");
	});

	it("should ignore digits after the CEP length", () => {
		expect(parseCep("01001000123")).toBe("01001000");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCep(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CEP", () => {
			expectMatchesPattern(parseCep, /^\d{0,8}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCep, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCep, "string", anyValue);
		});
	});
});

describe("parseCep types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCep).returns.toEqualTypeOf<string>();
	});
});
