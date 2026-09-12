import { CEP_LENGTH } from "../_internals/constants/cep";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCep } from "../parse-cep/parse-cep";
import { formatCep, type FormatCepOptions } from "./format-cep";

describe("formatCep", () => {
	it("should format CEP with mask", () => {
		expect(formatCep("")).toBe("");
		expect(formatCep("0")).toBe("0");
		expect(formatCep("01")).toBe("01");
		expect(formatCep("010")).toBe("010");
		expect(formatCep("0100")).toBe("0100");
		expect(formatCep("01001")).toBe("01001");
		expect(formatCep("010010")).toBe("01001-0");
		expect(formatCep("0100100")).toBe("01001-00");
		expect(formatCep("01001000")).toBe("01001-000");
	});

	it(`should NOT add digits after the CEP length (${CEP_LENGTH})`, () => {
		expect(formatCep("01001000000000")).toBe("01001-000");
	});

	it("should remove all non numeric characters", () => {
		expect(formatCep("a0.10cr01?00#ab0")).toBe("01001-000");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCep(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCep()).toBe("");
	});

	describe("properties", () => {
		const upToACep = digitsUpTo(8);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatCep, parseCep, upToACep);
		});

		test("should produce the documented mask shape for a full CEP", () => {
			expectMatchesPattern(formatCep, /^\d{5}-\d{3}$/, digits(8));
		});

		test("should left pad a shorter value up to the CEP length", () => {
			expectPadsToLength(formatCep, parseCep, upToACep, CEP_LENGTH);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatCep, "string", anyValue);
		});
	});
});

describe("formatCep types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCep).parameter(1).toEqualTypeOf<FormatCepOptions | undefined>();
		expectTypeOf(formatCep).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCepOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
