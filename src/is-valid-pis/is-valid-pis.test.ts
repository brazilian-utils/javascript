import * as fc from "fast-check";

import { PIS_LENGTH } from "../_internals/constants/pis";
import { anyValue, digitsOfOtherLength, maskSeparators } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generatePis } from "../generate-pis/generate-pis";
import { RESERVED_NUMBERS } from "./constants";
import { isValidPis } from "./is-valid-pis";

describe("isValidPis", () => {
	describe("should return false", () => {
		test("when it is on the RESERVED_NUMBERS", () => {
			for (const pis of RESERVED_NUMBERS) {
				expect(isValidPis(pis)).toBe(false);
			}
		});

		test("when it is an empty string", () => {
			expect(isValidPis("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis(false)).toBe(false);
		});

		test("when is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis({})).toBe(false);
		});

		test("when is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPis([])).toBe(false);
		});

		test("when it is a non-string that stringifies to a valid PIS", () => {
			// @ts-expect-error not a string
			expect(isValidPis([12_056_412_847])).toBe(false);
		});

		test("when it sanitizes to more digits than the PIS length, even if the first 11 match a valid PIS", () => {
			expect(isValidPis("1205641284799")).toBe(false);
		});

		test(`when it does not match the PIS length (${PIS_LENGTH})`, () => {
			expect(isValidPis("123456")).toBe(false);
		});

		test("when contains letters or special characters", () => {
			expect(isValidPis("12056Aabb412847")).toBe(false);
		});

		test("when contains only letters or special characters", () => {
			expect(isValidPis("abcabcabcde")).toBe(false);
		});

		test("when is an invalid PIS", () => {
			expect(isValidPis("12056412547")).toBe(false);
			expect(isValidPis("12081636639")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid PIS without mask", () => {
			expect(isValidPis("12056412847")).toBe(true);
		});

		test("when is valid PIS with mask", () => {
			expect(isValidPis("120.5641.284-7")).toBe(true);
		});

		test("when is valid PIS with a slash mask", () => {
			expect(isValidPis("120/56874/10-7")).toBe(true);
		});

		test("when is valid PIS with a whitespace mask", () => {
			expect(isValidPis("120 56874 10 7")).toBe(true);
		});

		test("when is a valid PIS with last digit 0", () => {
			expect(isValidPis("120.1213.266-0")).toBe(true);
			expect(isValidPis("120.7041.469-0")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept a generated PIS written with any of the accepted mask characters", () => {
			const masks = maskSeparators([".", "-", "/", " ", "(", ")", ",", "*"], 4, 3);

			fc.assert(
				fc.property(masks, (separators) => {
					const pis = generatePis();
					const head = `${separators[0]}${pis.slice(0, 3)}${separators[1]}`;
					const tail = `${pis.slice(3, 8)}${separators[2]}${pis.slice(8)}`;

					expect(isValidPis(`${head}${tail}${separators[3]}`)).toBe(true);
				}),
			);
		});

		test(`should reject any digits only value that is not ${PIS_LENGTH} digits long`, () => {
			expectRejected(isValidPis, digitsOfOtherLength(22, [PIS_LENGTH]));
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidPis, "boolean", anyValue);
		});
	});
});

describe("isValidPis types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidPis).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidPis).returns.toEqualTypeOf<boolean>();
	});
});
