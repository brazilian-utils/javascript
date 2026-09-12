import { describe, expect, it } from "../_internals/test/runtime";
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
});
