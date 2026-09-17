import { describe, expect, it } from "../test/runtime";
import { sanitizeToDigits } from "./sanitize-to-digits";

describe("sanitizeToDigits", () => {
	it("should remove all non-digit characters from a string", () => {
		expect(sanitizeToDigits("abc123def456")).toBe("123456");
	});

	it("should return the same string if it contains only digits", () => {
		expect(sanitizeToDigits("123456")).toBe("123456");
	});

	it("should handle an empty string", () => {
		expect(sanitizeToDigits("")).toBe("");
	});

	it("should handle a string with only non-digit characters", () => {
		expect(sanitizeToDigits("abcdef")).toBe("");
	});

	it("should handle a number input", () => {
		expect(sanitizeToDigits(123_456)).toBe("123456");
	});

	it("should handle a number with non-digit characters", () => {
		expect(sanitizeToDigits("12a34b56")).toBe("123456");
	});
});
