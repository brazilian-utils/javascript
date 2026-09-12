import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCnh } from "./parse-cnh";

describe("parseCnh", () => {
	it("should remove CNH formatting", () => {
		expect(parseCnh("000000001-19")).toBe("00000000119");
	});

	it("should remove non numeric characters", () => {
		expect(parseCnh("000.abc000001-19")).toBe("00000000119");
	});

	it("should ignore digits after the CNH length", () => {
		expect(parseCnh("00000000119123")).toBe("00000000119");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCnh(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CNH", () => {
			expectMatchesPattern(parseCnh, /^\d{0,11}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCnh, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCnh, "string", anyValue);
		});
	});
});

describe("parseCnh types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCnh).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCnh).returns.toEqualTypeOf<string>();
	});
});
