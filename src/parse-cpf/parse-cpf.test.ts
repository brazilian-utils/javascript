import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCpf } from "./parse-cpf";

describe("parseCpf", () => {
	it("should remove CPF mask characters", () => {
		expect(parseCpf("943.895.751-04")).toBe("94389575104");
	});

	it("should remove non numeric characters", () => {
		expect(parseCpf("943.?ABC895.751-04abc")).toBe("94389575104");
	});

	it("should ignore digits after the CPF length", () => {
		expect(parseCpf("94389575104123")).toBe("94389575104");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCpf(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CPF", () => {
			expectMatchesPattern(parseCpf, /^\d{0,11}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCpf, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCpf, "string", anyValue);
		});
	});
});

describe("parseCpf types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCpf).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCpf).returns.toEqualTypeOf<string>();
	});
});
