import * as fc from "fast-check";

import { licensePlates } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateLicensePlate } from "../generate-license-plate/generate-license-plate";
import { getFormatLicensePlate } from "../get-format-license-plate/get-format-license-plate";
import {
	type IsValidLicensePlateOptions,
	type LicensePlateFormat,
	isValidLicensePlate,
} from "./is-valid-license-plate";

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
				fc.property(fc.gen(), fc.constantFrom(...formats), (g, format) => {
					expect(isValidLicensePlate(g(licensePlates, format))).toBe(true);
				}),
			);
		});

		test("should ignore the separator and the case of a generated plate", () => {
			fc.assert(
				fc.property(fc.gen(), fc.constantFrom(...formats), (g, format) => {
					const plate = g(licensePlates, format);
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

describe("isValidLicensePlate with a format", () => {
	it("should accept only a Mercosul plate with the LLLNLNN format", () => {
		expect(isValidLicensePlate("ABC1D23", { format: "LLLNLNN" })).toBe(true);
		expect(isValidLicensePlate("abc-1d23", { format: "LLLNLNN" })).toBe(true);
		expect(isValidLicensePlate("ABC1234", { format: "LLLNLNN" })).toBe(false);
	});

	it("should accept only an old format plate with the LLLNNNN format", () => {
		expect(isValidLicensePlate("ABC1234", { format: "LLLNNNN" })).toBe(true);
		expect(isValidLicensePlate("abc 1234", { format: "LLLNNNN" })).toBe(true);
		expect(isValidLicensePlate("ABC1D23", { format: "LLLNNNN" })).toBe(false);
	});

	it("should still reject a plate that follows neither format", () => {
		expect(isValidLicensePlate("ABC12D3", { format: "LLLNLNN" })).toBe(false);
		expect(isValidLicensePlate("ABC12D3", { format: "LLLNNNN" })).toBe(false);
	});

	it("should accept either format without a format, as the Python library does without a type", () => {
		expect(isValidLicensePlate("ABC1234", {})).toBe(true);
		expect(isValidLicensePlate("ABC1D23", { format: undefined })).toBe(true);
	});

	it("should accept either format for a format outside the two, as the Python library does for an unknown type", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidLicensePlate("ABC1234", { format: "mercosul" })).toBe(true);
		// @ts-expect-error: intentionally invalid input
		expect(isValidLicensePlate("ABC1D23", { format: "lllnnnn" })).toBe(true);
		// @ts-expect-error: intentionally invalid input
		expect(isValidLicensePlate("ABC1D23", null)).toBe(true);
	});

	describe("properties", () => {
		test("should accept a plate with its own format and reject it with the other", () => {
			fc.assert(
				fc.property(fc.constantFrom<LicensePlateFormat>("LLLNNNN", "LLLNLNN"), (format) => {
					const plate = generateLicensePlate(format);
					const other: LicensePlateFormat = format === "LLLNNNN" ? "LLLNLNN" : "LLLNNNN";

					expect(isValidLicensePlate(plate, { format })).toBe(true);
					expect(isValidLicensePlate(plate, { format: other })).toBe(false);
				}),
			);
		});

		test("should agree with getFormatLicensePlate on every value and format", () => {
			fc.assert(
				fc.property(
					fc.string({ unit: "grapheme" }),
					fc.constantFrom<LicensePlateFormat>("LLLNNNN", "LLLNLNN"),
					(value, format) => {
						expect(isValidLicensePlate(value, { format })).toBe(
							getFormatLicensePlate(value) === format,
						);
					},
				),
			);
		});
	});
});

describe("isValidLicensePlate types", () => {
	test("should take a string and optional options, and return a boolean", () => {
		expectTypeOf(isValidLicensePlate).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidLicensePlate)
			.parameter(1)
			.toEqualTypeOf<IsValidLicensePlateOptions | undefined>();
		expectTypeOf<IsValidLicensePlateOptions>().toEqualTypeOf<{ format?: LicensePlateFormat }>();
		expectTypeOf(isValidLicensePlate).returns.toEqualTypeOf<boolean>();
	});
});
