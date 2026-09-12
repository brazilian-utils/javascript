import { describe, expect, test } from "../_internals/test/runtime";
import { isValidPassport } from "./is-valid-passport";

describe("isValidPassport", () => {
	describe("should return false", () => {
		test("when passport is not a string", () => {
			expect(isValidPassport(1)).toBe(false);
		});

		test("when passport is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport(null)).toBe(false);
		});

		test("when passport is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport()).toBe(false);
		});

		test("when passport is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport({})).toBe(false);
		});

		test("when passport length is different from 8", () => {
			expect(isValidPassport("1")).toBe(false);
		});

		test("when passport does not match the expected format", () => {
			expect(isValidPassport("1112223334-")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when passport is valid", () => {
			expect(isValidPassport("AA111111")).toBe(true);
			expect(isValidPassport("CL125167")).toBe(true);
		});

		test("when passport is lowercase", () => {
			expect(isValidPassport("ab123456")).toBe(true);
		});

		test("when passport contains mask symbols", () => {
			expect(isValidPassport("AB-123456")).toBe(true);
			expect(isValidPassport("AB.123.456")).toBe(true);
		});
	});
});
