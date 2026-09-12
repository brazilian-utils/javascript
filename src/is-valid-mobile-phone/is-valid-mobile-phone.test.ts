import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generatePhone } from "../generate-phone/generate-phone";
import {
	type IsValidMobilePhoneOptions,
	type PhoneVersion,
	isValidMobilePhone,
} from "./is-valid-mobile-phone";

describe("isValidMobilePhone", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidMobilePhone("")).toBe(false);
		});

		test("when it is a landline", () => {
			expect(isValidMobilePhone("1130000000")).toBe(false);
		});

		test("when length is invalid", () => {
			expect(isValidMobilePhone("1198765432")).toBe(false);
		});

		test("when it is null, undefined or a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidMobilePhone(null)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidMobilePhone()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidMobilePhone(11_987_654_321)).toBe(false);
		});

		test("when the country code leaves an invalid number", () => {
			expect(isValidMobilePhone("+55 11 3000-0000")).toBe(false);
			expect(isValidMobilePhone("+1 415 555 2671")).toBe(false);
		});

		test("when version 2 is requested but the first number digit is a version-1-only value (6, 7 or 8)", () => {
			expect(isValidMobilePhone("11712345678", { version: 2 })).toBe(false);
			expect(isValidMobilePhone("11612345678", { version: 2 })).toBe(false);
			expect(isValidMobilePhone("11812345678", { version: 2 })).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid mobile phone version 2", () => {
			expect(isValidMobilePhone("(11) 98765-4321")).toBe(true);
			expect(isValidMobilePhone("11987654321", { version: 2 })).toBe(true);
		});

		test("when is a valid mobile phone version 1", () => {
			expect(isValidMobilePhone("11712345678", { version: 1 })).toBe(true);
		});

		test("when it carries the country code", () => {
			expect(isValidMobilePhone("+5511987654321")).toBe(true);
			expect(isValidMobilePhone("+55 11 98765-4321")).toBe(true);
			expect(isValidMobilePhone("+55 (11) 98765-4321")).toBe(true);
			expect(isValidMobilePhone("0055 11 98765-4321")).toBe(true);
			expect(isValidMobilePhone("5511987654321")).toBe(true);
			expect(isValidMobilePhone("+55 11 98765-4321", { version: 2 })).toBe(true);
		});

		test("when the area code is 55", () => {
			expect(isValidMobilePhone("55987654321")).toBe(true);
			expect(isValidMobilePhone("+55 55 98765-4321")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept every generated mobile number under both rules", () => {
			fc.assert(
				fc.property(fc.constantFrom(1, 2), (version) => {
					const phone = generatePhone("mobile");

					expect(isValidMobilePhone(phone, { version })).toBe(true);
				}),
			);
		});

		test("should ignore the mask and the country code of a generated mobile number", () => {
			fc.assert(
				fc.property(fc.constant("mobile" as const), (type) => {
					const phone = generatePhone(type);
					const masked = `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;

					expect(isValidMobilePhone(masked)).toBe(true);
					expect(isValidMobilePhone(`+55 ${masked}`)).toBe(true);
				}),
			);
		});

		test("should reject every generated landline number", () => {
			fc.assert(
				fc.property(fc.constant("landline" as const), (type) => {
					expect(isValidMobilePhone(generatePhone(type))).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a mobile number with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidMobilePhone(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidMobilePhone types", () => {
	test("should take a string, optional options, and return a boolean", () => {
		expectTypeOf(isValidMobilePhone).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidMobilePhone)
			.parameter(1)
			.toEqualTypeOf<IsValidMobilePhoneOptions | undefined>();
		expectTypeOf(isValidMobilePhone).returns.toEqualTypeOf<boolean>();
	});

	test("should restrict version to the supported numbering rules", () => {
		expectTypeOf<IsValidMobilePhoneOptions["version"]>().toEqualTypeOf<PhoneVersion | undefined>();
		expectTypeOf<PhoneVersion>().toEqualTypeOf<1 | 2>();
	});
});
