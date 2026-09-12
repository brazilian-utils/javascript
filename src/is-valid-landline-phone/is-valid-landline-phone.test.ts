import { describe, expect, test } from "../_internals/test/runtime";
import { isValidLandlinePhone } from "./is-valid-landline-phone";

describe("isValidLandlinePhone", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidLandlinePhone("")).toBe(false);
		});

		test("when it is a mobile phone", () => {
			expect(isValidLandlinePhone("11987654321")).toBe(false);
		});

		test("when length is invalid", () => {
			expect(isValidLandlinePhone("113000000")).toBe(false);
		});

		test("when it is null, undefined or a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidLandlinePhone(null)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidLandlinePhone()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidLandlinePhone(1_130_000_000)).toBe(false);
		});

		test("when the country code leaves an invalid number", () => {
			expect(isValidLandlinePhone("+55 11 98765-4321")).toBe(false);
		});

		test("when the DDD is not a valid area code", () => {
			expect(isValidLandlinePhone("0030000000")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid landline phone", () => {
			expect(isValidLandlinePhone("(11) 3000-0000")).toBe(true);
			expect(isValidLandlinePhone("1130000000")).toBe(true);
		});

		test("when it carries the country code", () => {
			expect(isValidLandlinePhone("+551130000000")).toBe(true);
			expect(isValidLandlinePhone("+55 11 3000-0000")).toBe(true);
			expect(isValidLandlinePhone("+55 (11) 3000-0000")).toBe(true);
			expect(isValidLandlinePhone("0055 11 3000-0000")).toBe(true);
			expect(isValidLandlinePhone("551130000000")).toBe(true);
		});

		test("when the area code is 55", () => {
			expect(isValidLandlinePhone("5530000000")).toBe(true);
			expect(isValidLandlinePhone("+55 55 3000-0000")).toBe(true);
		});
	});
	test("should accept landlines whose first digit is 6 (Anatel Res. 749/2022, art. 11)", () => {
		expect(isValidLandlinePhone("1162654321")).toBe(true);
		expect(isValidLandlinePhone("(11) 6265-4321")).toBe(true);
		expect(isValidLandlinePhone("1172654321")).toBe(false);
	});
});
