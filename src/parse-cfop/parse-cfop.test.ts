import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCfop } from "./parse-cfop";

describe("parseCfop", () => {
	it("should remove CFOP mask characters", () => {
		expect(parseCfop("5.102")).toBe("5102");
	});

	it("should remove non numeric characters", () => {
		expect(parseCfop("5?ABC.102abc")).toBe("5102");
	});

	it("should ignore digits after the CFOP length", () => {
		expect(parseCfop("5102999")).toBe("5102");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCfop(5102)).toBe("5102");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCfop(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CFOP code", () => {
			expectMatchesPattern(parseCfop, /^\d{0,4}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCfop, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCfop, "string", anyValue);
		});
	});
});

describe("parseCfop types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCfop).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCfop).returns.toEqualTypeOf<string>();
	});
});
