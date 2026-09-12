import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateLicensePlate } from "../generate-license-plate/generate-license-plate";
import { type LicensePlateFormat, getFormatLicensePlate } from "./get-format-license-plate";

describe("getFormatLicensePlate", () => {
	it("should identify supported formats", () => {
		expect(getFormatLicensePlate("ABC1234")).toBe("LLLNNNN");
		expect(getFormatLicensePlate("ABC1D23")).toBe("LLLNLNN");
	});

	it("should return null for the withdrawn motorcycle sequence", () => {
		expect(getFormatLicensePlate("ABC12D3")).toBeNull();
	});

	it("should return null when the value has extra characters beyond the license plate length", () => {
		expect(getFormatLicensePlate("ABC1234EXTRA")).toBeNull();
	});

	it("should return null when the value does not match any supported format", () => {
		expect(getFormatLicensePlate("invalid")).toBeNull();
	});

	describe("properties", () => {
		test("should name the format of every generated plate", () => {
			fc.assert(
				fc.property(fc.constantFrom("LLLNNNN", "LLLNLNN"), (format) => {
					const plate = generateLicensePlate(format);

					expect(getFormatLicensePlate(plate)).toBe(format);
					expect(getFormatLicensePlate(plate.toLowerCase())).toBe(format);
				}),
			);
		});

		test("should never throw and always return a known format or null", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const format = getFormatLicensePlate(value as string);

					expect(format === null || format === "LLLNNNN" || format === "LLLNLNN").toBe(true);
				}),
			);
		});
	});
});

describe("getFormatLicensePlate types", () => {
	test("should take a string and return a license plate format or null", () => {
		expectTypeOf(getFormatLicensePlate).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getFormatLicensePlate).returns.toEqualTypeOf<LicensePlateFormat | null>();
	});

	test("should restrict the format to the supported license plate formats", () => {
		expectTypeOf<LicensePlateFormat>().toEqualTypeOf<"LLLNNNN" | "LLLNLNN">();
	});
});
