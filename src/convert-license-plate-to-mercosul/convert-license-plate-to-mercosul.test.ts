import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateLicensePlate } from "../generate-license-plate/generate-license-plate";
import { getFormatLicensePlate } from "../get-format-license-plate/get-format-license-plate";
import { DIGIT_TO_MERCOSUL_LETTER } from "./constants";
import { convertLicensePlateToMercosul } from "./convert-license-plate-to-mercosul";

describe("convertLicensePlateToMercosul", () => {
	describe("should return an empty string", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(convertLicensePlateToMercosul(null)).toBe("");
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(convertLicensePlateToMercosul()).toBe("");
		});

		test("when it is an empty string", () => {
			expect(convertLicensePlateToMercosul("")).toBe("");
		});

		test("when it is already a Mercosul car plate", () => {
			expect(convertLicensePlateToMercosul("ABC1D23")).toBe("");
		});

		test("when it is a Mercosul motorcycle plate", () => {
			expect(convertLicensePlateToMercosul("ABC12D3")).toBe("");
		});

		test("when it does not match any license plate format", () => {
			expect(convertLicensePlateToMercosul("invalid")).toBe("");
		});

		test("when it is an old format plate followed by extra characters", () => {
			expect(convertLicensePlateToMercosul("ABC1234EXTRA")).toBe("");
			expect(convertLicensePlateToMercosul("ABC12345")).toBe("");
		});

		test("when it is too short", () => {
			expect(convertLicensePlateToMercosul("ABC123")).toBe("");
		});
	});

	describe("should return the converted plate", () => {
		test("for a plate ending in each digit, per the official conversion table", () => {
			expect(convertLicensePlateToMercosul("ABC0000")).toBe("ABC0A00");
			expect(convertLicensePlateToMercosul("ABC1111")).toBe("ABC1B11");
			expect(convertLicensePlateToMercosul("ABC2222")).toBe("ABC2C22");
			expect(convertLicensePlateToMercosul("ABC3333")).toBe("ABC3D33");
			expect(convertLicensePlateToMercosul("ABC4444")).toBe("ABC4E44");
			expect(convertLicensePlateToMercosul("ABC5555")).toBe("ABC5F55");
			expect(convertLicensePlateToMercosul("ABC6666")).toBe("ABC6G66");
			expect(convertLicensePlateToMercosul("ABC7777")).toBe("ABC7H77");
			expect(convertLicensePlateToMercosul("ABC8888")).toBe("ABC8I88");
			expect(convertLicensePlateToMercosul("ABC9999")).toBe("ABC9J99");
		});

		test("for a lowercase plate", () => {
			expect(convertLicensePlateToMercosul("abc1234")).toBe("ABC1C34");
		});

		test("for a plate with the old format hyphen mask", () => {
			expect(convertLicensePlateToMercosul("ABC-1234")).toBe("ABC1C34");
		});
	});

	describe("properties", () => {
		test("should turn every old format plate into a Mercosul one", () => {
			fc.assert(
				fc.property(fc.constant("LLLNNNN" as const), (format) => {
					const plate = generateLicensePlate(format);
					const converted = convertLicensePlateToMercosul(plate);

					expect(getFormatLicensePlate(converted)).toBe("LLLNLNN");
					expect(converted.slice(0, 4)).toBe(plate.slice(0, 4));
					expect(converted.charAt(4)).toBe(DIGIT_TO_MERCOSUL_LETTER[plate.charAt(4)]);
					expect(converted.slice(5)).toBe(plate.slice(5));
				}),
			);
		});

		test("should convert a plate only once", () => {
			fc.assert(
				fc.property(fc.constantFrom("LLLNNNN", "LLLNLNN"), (format) => {
					const converted = convertLicensePlateToMercosul(generateLicensePlate(format));

					expect(convertLicensePlateToMercosul(converted)).toBe("");
				}),
			);
		});

		test("should never throw and always return the converted plate as a string", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof convertLicensePlateToMercosul(value as string)).toBe("string");
				}),
			);
		});
	});
});

describe("convertLicensePlateToMercosul types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(convertLicensePlateToMercosul).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(convertLicensePlateToMercosul).returns.toEqualTypeOf<string>();
	});
});
