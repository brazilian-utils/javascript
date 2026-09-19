import * as fc from "fast-check";

import { anyValue, digitsOfOtherLength, maskSeparators } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateSuframa } from "../generate-suframa/generate-suframa";
import { isValidSuframa } from "./is-valid-suframa";

describe("isValidSuframa", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidSuframa("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa([])).toBe(false);
		});

		test("when it is a non-string that stringifies to a valid Inscrição SUFRAMA", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa(123_456_789)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidSuframa([123_456_789])).toBe(false);
		});

		test("when it has fewer than 8 digits", () => {
			expect(isValidSuframa("1234567")).toBe(false);
			expect(isValidSuframa("0001018")).toBe(false);
		});

		test("when it has more than 9 digits, even if the first 9 are valid", () => {
			expect(isValidSuframa("1234567899")).toBe(false);
			expect(isValidSuframa("1234567090")).toBe(false);
		});

		test("when it contains letters or special characters", () => {
			expect(isValidSuframa("12345678A9")).toBe(false);
			expect(isValidSuframa("12#3456#789")).toBe(false);
			expect(isValidSuframa("abcdefghi")).toBe(false);
		});

		test("when the check digit is wrong", () => {
			expect(isValidSuframa("123456780")).toBe(false);
			expect(isValidSuframa("123456788")).toBe(false);
			expect(isValidSuframa("205678105")).toBe(false);
			expect(isValidSuframa("10001019")).toBe(false);
		});

		test("when the remainder is 0 or 1 and the check digit is not 0", () => {
			expect(isValidSuframa("100000011")).toBe(false);
			expect(isValidSuframa("600001301")).toBe(false);
		});

		test("when the sector code is 00", () => {
			expect(isValidSuframa("001234560")).toBe(false);
			expect(isValidSuframa("000000000")).toBe(false);
			expect(isValidSuframa("000000019")).toBe(false);
		});

		test("when an 8 digit value starts with 0, which reads as sector code 00", () => {
			expect(isValidSuframa("01234560")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when it is the example of the NF-e manual", () => {
			expect(isValidSuframa("123456789")).toBe(true);
		});

		test("when it is a valid Inscrição SUFRAMA without mask", () => {
			expect(isValidSuframa("010001018")).toBe(true);
			expect(isValidSuframa("101234015")).toBe(true);
			expect(isValidSuframa("205678106")).toBe(true);
			expect(isValidSuframa("601234308")).toBe(true);
		});

		test("when it is a valid Inscrição SUFRAMA with mask", () => {
			expect(isValidSuframa("12.3456.789")).toBe(true);
			expect(isValidSuframa("20.5678.10-6")).toBe(true);
			expect(isValidSuframa("20 5678 10 6")).toBe(true);
		});

		test("when it has 8 digits because the sector code lost its leading zero", () => {
			expect(isValidSuframa("10001018")).toBe(true);
			expect(isValidSuframa("1.0001.018")).toBe(true);
		});

		test("when the remainder is 0 and the check digit is 0", () => {
			expect(isValidSuframa("100000010")).toBe(true);
		});

		test("when the remainder is 1 and the check digit is 0", () => {
			expect(isValidSuframa("600001300")).toBe(true);
		});

		test("when the remainder is 10 and the check digit is 1", () => {
			expect(isValidSuframa("100000061")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept a generated Inscrição SUFRAMA written with any of the accepted mask characters", () => {
			const masks = maskSeparators([".", "-", "/", " ", "(", ")", ",", "*"], 4, 3);

			fc.assert(
				fc.property(masks, (separators) => {
					const suframa = generateSuframa();
					const head = `${separators[0]}${suframa.slice(0, 2)}${separators[1]}`;
					const tail = `${suframa.slice(2, 6)}${separators[2]}${suframa.slice(6)}`;

					expect(isValidSuframa(`${head}${tail}${separators[3]}`)).toBe(true);
				}),
			);
		});

		test("should reject any digits only value that is not 8 or 9 digits long", () => {
			expectRejected(isValidSuframa, digitsOfOtherLength(22, [8, 9]));
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidSuframa, "boolean", anyValue);
		});
	});
});

describe("isValidSuframa types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidSuframa).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidSuframa).returns.toEqualTypeOf<boolean>();
	});
});
