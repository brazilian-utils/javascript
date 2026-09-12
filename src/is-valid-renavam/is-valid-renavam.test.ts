import { describe, expect, test } from "../_internals/test/runtime";
import { isValidRenavam } from "./is-valid-renavam";

describe("isValidRenavam", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidRenavam("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam([])).toBe(false);
		});

		test("when it has less than 9 digits", () => {
			expect(isValidRenavam("12345678")).toBe(false);
		});

		test("when it has more than 11 digits", () => {
			expect(isValidRenavam("123456789012")).toBe(false);
		});

		test("when it contains only letters or special characters", () => {
			expect(isValidRenavam("abcdefghij")).toBe(false);
		});

		test("when it is a RENAVAM with invalid checksum (639884963 has its last digit changed from the valid 639884962)", () => {
			expect(isValidRenavam("639884963")).toBe(false);
			expect(isValidRenavam("12345678901")).toBe(false);
		});

		test("when it has mixed characters that sanitize to an invalid RENAVAM (invalid checksum)", () => {
			expect(isValidRenavam("12345678901abc")).toBe(false);
			expect(isValidRenavam("639884963xyz")).toBe(false);
		});

		test("when is a RENAVAM with invalid length: 8 digits (too short), 10 digits (invalid), or 12 digits (too long)", () => {
			expect(isValidRenavam("12345678")).toBe(false);
			expect(isValidRenavam("1234567890")).toBe(false);
			expect(isValidRenavam("123456789012")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a RENAVAM valid with 9 digits (old format)", () => {
			expect(isValidRenavam("639884962")).toBe(true);
		});

		test("when is a RENAVAM valid with 11 digits (new format)", () => {
			expect(isValidRenavam("00639884962")).toBe(true);
		});

		test("when is a RENAVAM valid as number", () => {
			expect(isValidRenavam(639_884_962)).toBe(true);
		});

		test("when is a RENAVAM valid with mixed characters that sanitize to a valid RENAVAM", () => {
			expect(isValidRenavam("639884962abc")).toBe(true);
		});

		test("when the multiplier cycle wraps from 9 back to 2 on non-zero digits", () => {
			expect(isValidRenavam("12345678900")).toBe(true);
		});

		test("when the checksum remainder is exactly 1 (expected digit 0, not 10)", () => {
			expect(isValidRenavam("00000000060")).toBe(true);
		});
	});
});
