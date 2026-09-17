import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseProcessoJuridico } from "./parse-processo-juridico";

describe("parseProcessoJuridico", () => {
	it("should remove processo juridico mask characters", () => {
		expect(parseProcessoJuridico("0002080-25.2012.5.15.0049")).toBe("00020802520125150049");
	});

	it("should also accept the legacy fused mask", () => {
		expect(parseProcessoJuridico("0002080-25.2012.515.0049")).toBe("00020802520125150049");
	});

	it("should remove non numeric characters", () => {
		expect(parseProcessoJuridico("0002080@$25201%!@2515.%0049")).toBe("00020802520125150049");
	});

	it("should ignore digits after the processo juridico length", () => {
		expect(parseProcessoJuridico("00020802520125150049123")).toBe("00020802520125150049");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseProcessoJuridico(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a processo juridico", () => {
			expectMatchesPattern(parseProcessoJuridico, /^\d{0,20}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseProcessoJuridico, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseProcessoJuridico, "string", anyValue);
		});
	});
});

describe("parseProcessoJuridico types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseProcessoJuridico).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseProcessoJuridico).returns.toEqualTypeOf<string>();
	});
});
