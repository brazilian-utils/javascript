import {
	anyValue,
	digits,
	digitsOfOtherLength,
	maskedValues,
} from "../_internals/test/arbitraries";
import {
	expectAccepted,
	expectAlwaysReturnsType,
	expectRejected,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCep } from "./is-valid-cep";

describe("isValidCep", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidCep("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCep(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCep()).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCep({})).toBe(false);
		});

		test("when it is an array, even one that stringifies to a valid CEP", () => {
			// @ts-expect-error not a string or number
			expect(isValidCep(["01310100"])).toBe(false);
		});

		test("when length is less than 8", () => {
			expect(isValidCep("12345")).toBe(false);
		});

		test("when length is greater than 8", () => {
			expect(isValidCep("123456789")).toBe(false);
		});

		test("when it contains letters", () => {
			expect(isValidCep("abc01310100")).toBe(false);
			expect(isValidCep("0131010a")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a CEP valid without mask", () => {
			expect(isValidCep("01310100")).toBe(true);
		});

		test("when is a CEP valid with mask", () => {
			expect(isValidCep("01310-100")).toBe(true);
		});

		test("when is a CEP valid as a number", () => {
			expect(isValidCep(20_040_020)).toBe(true);
		});

		test("when is a CEP valid with leading/trailing whitespace", () => {
			expect(isValidCep(" 01310-100 ")).toBe(true);
		});

		test("when is a CEP valid with any punctuation the published version accepted", () => {
			expect(isValidCep("92.500-000")).toBe(true);
			expect(isValidCep("013 10 100")).toBe(true);
			expect(isValidCep("01310.100")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should ignore dots, hyphens and spaces wherever they appear", () => {
			expectAccepted(isValidCep, maskedValues(digits(8), [".", "-", " "], 2));
		});

		test("should reject any digits only value that is not 8 digits long", () => {
			expectRejected(isValidCep, digitsOfOtherLength(16, [8]));
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidCep, "boolean", anyValue);
		});
	});
});

describe("isValidCep types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCep).returns.toEqualTypeOf<boolean>();
	});
});
