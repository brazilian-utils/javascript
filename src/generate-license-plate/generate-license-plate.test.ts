import { describe, expect, it } from "../_internals/test/runtime";
import { isValidLicensePlate } from "../is-valid-license-plate/is-valid-license-plate";
import { generateLicensePlate } from "./generate-license-plate";

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
		// @ts-expect-error
		expect(generateLicensePlate(123)).toMatch(/^[A-Z]{3}\d[A-Z]\d{2}$/);
	});

	it("should map a forced random value to the hand-computed letter and digit, per position", () => {
		runWithForcedRandom(0.5, () => {
			expect(generateLicensePlate("LLLNLNN")).toBe("NNN5N55");
		});
	});
});
