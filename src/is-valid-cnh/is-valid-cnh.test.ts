import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCnh } from "./is-valid-cnh";

describe("isValidCnh", () => {
	it("should return true for valid CNH", () => {
		expect(isValidCnh("00000000119")).toBe(true);
		expect(isValidCnh("000000001-19")).toBe(true);
	});

	it("should return true for a CNH that hits the secondVerifier<0 branch", () => {
		expect(isValidCnh("00000009309")).toBe(true);
	});

	it("should return false for invalid CNH", () => {
		expect(isValidCnh("12345678901")).toBe(false);
		expect(isValidCnh("11111111111")).toBe(false);
	});

	it("should return false when the first verifier digit does not match", () => {
		expect(isValidCnh("00000000129")).toBe(false);
	});

	it("should return false when it sanitizes to more than 11 digits, even if the first 11 match a valid CNH", () => {
		expect(isValidCnh("0000000011900")).toBe(false);
	});

	it("should return false for falsy or non-string values", () => {
		expect(isValidCnh("")).toBe(false);
		// @ts-expect-error
		expect(isValidCnh(null)).toBe(false);
		// @ts-expect-error
		expect(isValidCnh(undefined)).toBe(false);
	});
});
