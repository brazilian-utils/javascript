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

		test("when a domain label ends with a hyphen", () => {
			expect(isValidEmail("user@example-.com")).toBe(false);
		});

		test("when a domain label starts with a hyphen", () => {
			expect(isValidEmail("user@-example.com")).toBe(false);
		});

		test("when a domain label is longer than the 63 characters WHATWG allows", () => {
			expect(isValidEmail(`user@${"a".repeat(64)}.com`)).toBe(false);
		});

		test("when the final domain label is longer than the 63 characters WHATWG allows", () => {
			expect(isValidEmail(`user@example.${"a".repeat(64)}`)).toBe(false);
		});

		test("when the local part is longer than 64 characters", () => {
			expect(isValidEmail(`${"a".repeat(65)}@example.com`)).toBe(false);
			expect(isValidEmail(`${"a".repeat(300)}@a.com`)).toBe(false);
		});

		test("when the whole address is longer than 254 characters", () => {
			const label = "a".repeat(63);

			expect(isValidEmail(`user@${label}.${label}.${label}.${"a".repeat(54)}.com`)).toBe(false);
		});

		test("when the punycode final label is malformed", () => {
			expect(isValidEmail("user@example.xn--")).toBe(false);
			expect(isValidEmail("user@example.xn---")).toBe(false);
			expect(isValidEmail("user@example.xn--p1ai-")).toBe(false);
			expect(isValidEmail(`user@example.xn--${"a".repeat(60)}`)).toBe(false);
		});

		test("when the local part holds a character outside the accepted set", () => {
			for (const local of ["a%b", "a=b", "a?b", "a/b", "a!b", "a#b", "a$b", "a&b", "a*b", "x'"]) {
				expect(isValidEmail(`${local}@a.com`)).toBe(false);
			}
		});

		test("when the domain has a single label", () => {
			expect(isValidEmail("user@localhost")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when the local part has exactly 64 characters", () => {
			expect(isValidEmail(`${"a".repeat(64)}@example.com`)).toBe(true);
		});

		test("when the address has exactly 254 characters", () => {
			const label = "a".repeat(63);

			expect(isValidEmail(`user@${label}.${label}.${label}.${"a".repeat(53)}.com`)).toBe(true);
		});

		test("when the final label is punycode", () => {
			expect(isValidEmail("user@example.xn--p1ai")).toBe(true);
			expect(isValidEmail("user@example.XN--P1AI")).toBe(true);
			expect(isValidEmail(`user@example.xn--${"a".repeat(59)}`)).toBe(true);
		});

		test("when is a valid email", () => {
			expect(isValidEmail("user@example.com")).toBe(true);
			expect(isValidEmail("user__@example.com")).toBe(true);
			expect(isValidEmail("user__user@example.com")).toBe(true);
		});

		test("when is a valid email with subdomain", () => {
			expect(isValidEmail("test@subdomain.example.com")).toBe(true);
		});

		test("when a domain label carries an inner hyphen", () => {
			expect(isValidEmail("user@ex-ample.com")).toBe(true);
		});

		test("when a domain label is exactly 63 characters long", () => {
			expect(isValidEmail(`user@${"a".repeat(63)}.com`)).toBe(true);
		});

		test("when the final domain label is exactly 63 characters long", () => {
			expect(isValidEmail(`user@example.${"a".repeat(63)}`)).toBe(true);
		});

		test("when is a valid email with special characters", () => {
			expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
		});
	});

	describe("properties", () => {
		const addresses = fc.stringMatching(
			/^[a-z0-9][a-z0-9_+-]{0,15}@[a-z0-9](?:[a-z0-9-]{0,9}[a-z0-9])?\.[a-z]{2,6}$/,
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
