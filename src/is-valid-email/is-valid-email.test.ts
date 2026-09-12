import { describe, expect, test } from "../_internals/test/runtime";
import { isValidEmail } from "./is-valid-email";

describe("isValidEmail", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidEmail("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidEmail(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidEmail(undefined)).toBe(false);
		});

		test("when it is missing @", () => {
			expect(isValidEmail("invalid.email")).toBe(false);
		});

		test("when it is missing domain", () => {
			expect(isValidEmail("user@")).toBe(false);
		});

		test("when it is missing user", () => {
			expect(isValidEmail("@domain.com")).toBe(false);
		});

		test("when it is a non-string that stringifies to a valid email", () => {
			// @ts-expect-error not a string
			expect(isValidEmail(["user@example.com"])).toBe(false);
		});

		test("when there is garbage before an otherwise valid email", () => {
			expect(isValidEmail("!!!user@example.com")).toBe(false);
		});

		test("when there is garbage after an otherwise valid email", () => {
			expect(isValidEmail("user@example.com!!!")).toBe(false);
		});

		test("when the local part has consecutive dots that are not at the very start", () => {
			expect(isValidEmail("ab..c@example.com")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid email", () => {
			expect(isValidEmail("user@example.com")).toBe(true);
			expect(isValidEmail("user__@example.com")).toBe(true);
			expect(isValidEmail("user__user@example.com")).toBe(true);
		});

		test("when is a valid email with subdomain", () => {
			expect(isValidEmail("test@subdomain.example.com")).toBe(true);
		});

		test("when is a valid email with special characters", () => {
			expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
		});
	});
});
