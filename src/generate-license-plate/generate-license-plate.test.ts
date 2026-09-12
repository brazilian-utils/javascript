import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getFormatLicensePlate } from "../get-format-license-plate/get-format-license-plate";
import { isValidLicensePlate } from "../is-valid-license-plate/is-valid-license-plate";
import { type GenerateLicensePlateFormat, generateLicensePlate } from "./generate-license-plate";

const runWithForcedRandom = (forced: number, run: () => void) => {
	const originalRandom = Math.random;

	Math.random = () => forced;

	try {
		run();
	} finally {
		Math.random = originalRandom;
	}
};

describe("generateLicensePlate", () => {
	it("should generate valid plates for all supported formats", () => {
		expect(isValidLicensePlate(generateLicensePlate("LLLNNNN"))).toBe(true);
		expect(isValidLicensePlate(generateLicensePlate("LLLNLNN"))).toBe(true);
	});

	it("should honor an explicit old format string instead of always falling back to mercosul", () => {
		const plate = generateLicensePlate("LLLNNNN");

		expect(plate).toMatch(/^[A-Z]{3}\d{4}$/);
	});

	it("should default to the mercosul format", () => {
		const plate = generateLicensePlate();

		expect(isValidLicensePlate(plate)).toBe(true);
		expect(plate).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
	});

	it("should fall back to the mercosul format when the argument is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(generateLicensePlate(123)).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
	});

	it("should map a forced random value to the hand-computed letter and digit, per position", () => {
		runWithForcedRandom(0.5, () => {
			expect(generateLicensePlate("LLLNLNN")).toBe("NNN5N55");
		});
	});

	describe("properties", () => {
		const formats = ["LLLNNNN", "LLLNLNN"] as const;

		test("should always generate a plate of the requested format", () => {
			fc.assert(
				fc.property(fc.constantFrom(...formats), (format) => {
					const plate = generateLicensePlate(format);

					expect(plate.length).toBe(7);
					expect(getFormatLicensePlate(plate)).toBe(format);
					expect(isValidLicensePlate(plate)).toBe(true);
				}),
			);
		});

		test("should always generate a Mercosul plate when no format is given", () => {
			fc.assert(
				fc.property(fc.constant(null), () => {
					expect(getFormatLicensePlate(generateLicensePlate())).toBe("LLLNLNN");
				}),
			);
		});
	});
});

describe("generateLicensePlate types", () => {
	test("should take an optional format and return a string", () => {
		expectTypeOf(generateLicensePlate)
			.parameter(0)
			.toEqualTypeOf<GenerateLicensePlateFormat | undefined>();
		expectTypeOf(generateLicensePlate).returns.toEqualTypeOf<string>();
	});

	test("should restrict the format to the supported license plate formats", () => {
		expectTypeOf<GenerateLicensePlateFormat>().toEqualTypeOf<"LLLNNNN" | "LLLNLNN">();
	});
});
