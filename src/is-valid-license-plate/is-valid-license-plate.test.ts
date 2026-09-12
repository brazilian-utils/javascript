import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateLicensePlate } from "../generate-license-plate/generate-license-plate";
import { getFormatLicensePlate } from "../get-format-license-plate/get-format-license-plate";
import { isValidLicensePlate } from "./is-valid-license-plate";

describe("isValidLicensePlate", () => {
	describe("should return false", () => {
		it("when it is an empty string", () => {
			expect(isValidLicensePlate("")).toBe(false);
		});

		it("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate(null)).toBe(false);
		});

		it("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate()).toBe(false);
		});

		it("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate(false)).toBe(false);
		});

		it("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate({})).toBe(false);
		});

		it("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLicensePlate([])).toBe(false);
		});

		it("when brazilian license plate format is invalid", () => {
			expect(isValidLicensePlate("abc12345")).toBe(false);
			expect(isValidLicensePlate("5abc1234")).toBe(false);
			expect(isValidLicensePlate("abcd1234")).toBe(false);
			expect(isValidLicensePlate("abcd234")).toBe(false);
		});

		it("when it has extra characters beyond the license plate length", () => {
			expect(isValidLicensePlate("ABC1234EXTRA")).toBe(false);
		});

		it("when it uses the withdrawn motorcycle sequence", () => {
			expect(isValidLicensePlate("ABC12D3")).toBe(false);
			expect(isValidLicensePlate("abc12d3")).toBe(false);
		});
	});

	describe("should return true", () => {
		it("when brazilian license plate format is valid", () => {
			expect(isValidLicensePlate("abc1234")).toBe(true);
			expect(isValidLicensePlate("ABC1234")).toBe(true);
			expect(isValidLicensePlate("abc-1234")).toBe(true);
			expect(isValidLicensePlate("ABC-1234")).toBe(true);
		});

		it("when mercosul license plate format is valid", () => {
			expect(isValidLicensePlate("abc1d23")).toBe(true);
			expect(isValidLicensePlate("ABC1D23")).toBe(true);
		});

		it("when it has a whitespace mask", () => {
			expect(isValidLicensePlate("ABC 1234")).toBe(true);
			expect(isValidLicensePlate("  abc1234 ")).toBe(true);
		});

		it("when the mercosul format has a hyphen mask", () => {
			expect(isValidLicensePlate("ABC-1D23")).toBe(true);
		});
	});

	describe("properties", () => {
		const formats = ["LLLNNNN", "LLLNLNN"] as const;

		test("should accept every generated plate of both formats", () => {
			fc.assert(
				fc.property(fc.constantFrom(...formats), (format) => {
					expect(isValidLicensePlate(generateLicensePlate(format))).toBe(true);
				}),
			);
		});

		test("should ignore the separator and the case of a generated plate", () => {
			fc.assert(
				fc.property(fc.constantFrom(...formats), (format) => {
					const plate = generateLicensePlate(format);
					const masked = `${plate.slice(0, 3)}-${plate.slice(3)}`;

					expect(isValidLicensePlate(masked.toLowerCase())).toBe(true);
					expect(isValidLicensePlate(` ${plate.slice(0, 3)} ${plate.slice(3)} `)).toBe(true);
				}),
			);
		});

		test("should agree with getFormatLicensePlate on every value", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(isValidLicensePlate(value)).toBe(getFormatLicensePlate(value) !== null);
				}),
			);
		});

		test("should never throw and always judge a plate with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidLicensePlate(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidLicensePlate types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidLicensePlate).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidLicensePlate).returns.toEqualTypeOf<boolean>();
	});
});
