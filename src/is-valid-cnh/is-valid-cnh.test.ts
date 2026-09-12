import * as fc from "fast-check";

import { anyValue, digitsOfOtherLength, maskSeparators } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateCnh } from "../generate-cnh/generate-cnh";
import { isValidCnh } from "./is-valid-cnh";

describe("isValidCnh", () => {
	it("should return true for valid CNH", () => {
		expect(isValidCnh("00000000119")).toBe(true);
		expect(isValidCnh("000000001-19")).toBe(true);
	});

	it("should return true for a CNH that hits the secondVerifier<0 branch", () => {
		expect(isValidCnh("00000009309")).toBe(true);
	});

	it("should return false for invalid CNH", () => {
		expect(isValidCnh("12345678901")).toBe(false);
		expect(isValidCnh("11111111111")).toBe(false);
	});

	it("should return false when the first verifier digit does not match", () => {
		expect(isValidCnh("00000000129")).toBe(false);
	});

	it("should return false when it sanitizes to more than 11 digits, even if the first 11 match a valid CNH", () => {
		expect(isValidCnh("0000000011900")).toBe(false);
	});

	it("should return false for falsy or non-string values", () => {
		expect(isValidCnh("")).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidCnh(null)).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidCnh()).toBe(false);
	});

	describe("properties", () => {
		test("should accept a generated CNH whatever mask characters surround its digits", () => {
			fc.assert(
				fc.property(maskSeparators([".", "-", "/", " "], 3, 3), (separators) => {
					const cnh = generateCnh();
					const base = `${separators[0]}${cnh.slice(0, 9)}${separators[1]}`;

					expect(isValidCnh(`${base}${cnh.slice(9)}${separators[2]}`)).toBe(true);
				}),
			);
		});

		test("should reject any digits only value that is not 11 digits long", () => {
			expectRejected(isValidCnh, digitsOfOtherLength(22, [11]));
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidCnh, "boolean", anyValue);
		});
	});
});

describe("isValidCnh types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidCnh).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidCnh).returns.toEqualTypeOf<boolean>();
	});
});
