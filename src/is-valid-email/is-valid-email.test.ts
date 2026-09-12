import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidEmail } from "./is-valid-email";

describe("isValidEmail", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidEmail("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidEmail(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidEmail()).toBe(false);
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

	describe("properties", () => {
		const addresses = fc.stringMatching(
			/^[a-z0-9][a-z0-9_+-]{0,15}@[a-z0-9][a-z0-9-]{0,10}\.[a-z]{2,6}$/,
		);

		test("should accept a well-formed address", () => {
			fc.assert(
				fc.property(addresses, (value) => {
					expect(isValidEmail(value)).toBe(true);
				}),
			);
		});

		test("should not care about the case of the address", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(isValidEmail(value.toUpperCase())).toBe(isValidEmail(value));
				}),
			);
		});

		test("should reject any value without an at sign", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					fc.pre(!value.includes("@"));

					expect(isValidEmail(value)).toBe(false);
				}),
			);
		});

		test("should never throw and always judge an address with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidEmail(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidEmail types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidEmail).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidEmail).returns.toEqualTypeOf<boolean>();
	});
});
