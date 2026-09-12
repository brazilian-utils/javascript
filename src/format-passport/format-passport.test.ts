import { describe, expect, test } from "../_internals/test/runtime";
import { formatPassport } from "./format-passport";

describe("formatPassport", () => {
	describe("should return the formatted passport", () => {
		test("when passport is valid", () => {
			expect(formatPassport("")).toBe("");
			expect(formatPassport("A")).toBe("A");
			expect(formatPassport("AB")).toBe("AB");
			expect(formatPassport("AB1")).toBe("AB1");
			expect(formatPassport("AB12")).toBe("AB12");
			expect(formatPassport("AB123")).toBe("AB123");
			expect(formatPassport("AB1234")).toBe("AB1234");
			expect(formatPassport("AB12345")).toBe("AB12345");
			expect(formatPassport("AB123456")).toBe("AB123456");
		});

		test("when passport has lowercase letters", () => {
			expect(formatPassport("")).toBe("");
			expect(formatPassport("a")).toBe("A");
			expect(formatPassport("ac")).toBe("AC");
			expect(formatPassport("acd")).toBe("ACD");
			expect(formatPassport("acd1")).toBe("ACD1");
			expect(formatPassport("acd12")).toBe("ACD12");
			expect(formatPassport("acd127")).toBe("ACD127");
			expect(formatPassport("acd1273")).toBe("ACD1273");
			expect(formatPassport("acd12736")).toBe("ACD12736");
		});

		test("when passport contains symbols", () => {
			expect(formatPassport("AB-123.456")).toBe("AB123456");
		});

		test("when passport has extra characters", () => {
			expect(formatPassport("AB123456789")).toBe("AB123456");
		});
	});

	describe("should return an empty string", () => {
		test("when passport is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(formatPassport(null)).toBe("");
			// @ts-expect-error: intentionally invalid input
			expect(formatPassport()).toBe("");
			// @ts-expect-error: intentionally invalid input
			expect(formatPassport(123)).toBe("");
		});
	});
});
