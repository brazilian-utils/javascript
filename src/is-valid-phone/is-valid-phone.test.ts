import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generatePhone } from "../generate-phone/generate-phone";
import {
	type IsValidPhoneOptions,
	type PhoneType,
	type PhoneVersion,
	isValidPhone,
} from "./is-valid-phone";

describe("isValidPhone", () => {
	describe("service numbers written with a country code", () => {
		test("should accept an explicit country code before a service number", () => {
			expect(isValidPhone("+55 0800 123 4567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("0055 4004-1234", { accept: ["service"] })).toBe(true);
		});

		test("should accept a bare 55 before a service number, as parsePhone reads it", () => {
			expect(isValidPhone("5508001234567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("55 0300 123 4567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("5508001234567")).toBe(false);
			expect(isValidPhone("+55 0800 123 4567")).toBe(false);
		});
	});

	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidPhone("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone(null)).toBe(false);
		});

		test("when it is undefined or a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone(11_987_654_321)).toBe(false);
		});

		test("when length is invalid", () => {
			expect(isValidPhone("123")).toBe(false);
		});

		test("when DDD is invalid", () => {
			expect(isValidPhone("00999999999")).toBe(false);
		});

		test("when it is a service phone and accept is left to its default", () => {
			expect(isValidPhone("08001234567")).toBe(false);
			expect(isValidPhone("40041234")).toBe(false);
		});

		test("when accept is empty", () => {
			expect(isValidPhone("(11) 98765-4321", { accept: [] })).toBe(false);
			expect(isValidPhone("1130000000", { accept: [] })).toBe(false);
			expect(isValidPhone("08001234567", { accept: [] })).toBe(false);
		});

		test("when the kind is not accepted", () => {
			expect(isValidPhone("11987654321", { accept: ["landline"] })).toBe(false);
			expect(isValidPhone("1130000000", { accept: ["mobile"] })).toBe(false);
			expect(isValidPhone("11987654321", { accept: ["service"] })).toBe(false);
			expect(isValidPhone("08001234567", { accept: ["mobile", "landline"] })).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid mobile phone version 2", () => {
			expect(isValidPhone("(11) 98765-4321")).toBe(true);
			expect(isValidPhone("11987654321", { version: 2 })).toBe(true);
		});

		test("when is a valid landline phone", () => {
			expect(isValidPhone("(11) 3000-0000")).toBe(true);
			expect(isValidPhone("1130000000")).toBe(true);
		});

		test("when is a valid mobile phone version 1", () => {
			expect(isValidPhone("11712345678", { version: 1 })).toBe(true);
		});

		test("when it carries the country code", () => {
			expect(isValidPhone("+5511987654321")).toBe(true);
			expect(isValidPhone("+55 11 98765-4321")).toBe(true);
			expect(isValidPhone("+55 (11) 98765-4321")).toBe(true);
			expect(isValidPhone("0055 11 98765-4321")).toBe(true);
			expect(isValidPhone("5511987654321")).toBe(true);
			expect(isValidPhone("+55 (11) 3000-0000")).toBe(true);
			expect(isValidPhone("+55 11 98765-4321", { version: 2 })).toBe(true);
		});

		test("when the kind is accepted", () => {
			expect(isValidPhone("11987654321", { accept: ["mobile"] })).toBe(true);
			expect(isValidPhone("1130000000", { accept: ["landline"] })).toBe(true);
			expect(isValidPhone("08001234567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("40041234", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("190", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("0800 123 4567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("11987654321", { accept: ["mobile", "landline", "service"] })).toBe(true);
			expect(isValidPhone("08001234567", { accept: ["mobile", "landline", "service"] })).toBe(true);
		});
	});

	describe("properties", () => {
		const geographic = ["mobile", "landline"] as const;

		test("should accept every generated geographic number, masked or not", () => {
			fc.assert(
				fc.property(fc.constantFrom(...geographic), (type) => {
					const phone = generatePhone(type);
					const masked = `(${phone.slice(0, 2)}) ${phone.slice(2, -4)}-${phone.slice(-4)}`;

					expect(isValidPhone(phone)).toBe(true);
					expect(isValidPhone(masked)).toBe(true);
					expect(isValidPhone(`+55 ${masked}`)).toBe(true);
					expect(isValidPhone(`0055${phone}`)).toBe(true);
				}),
			);
		});

		test("should only accept a generated service number when asked to", () => {
			fc.assert(
				fc.property(fc.constant("service" as const), (type) => {
					const phone = generatePhone(type);

					expect(isValidPhone(phone)).toBe(false);
					expect(isValidPhone(phone, { accept: ["service"] })).toBe(true);
				}),
			);
		});

		test("should accept nothing when no kind of number is accepted", () => {
			fc.assert(
				fc.property(fc.constantFrom("mobile", "landline", "service"), (type) => {
					expect(isValidPhone(generatePhone(type), { accept: [] })).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a phone number with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidPhone(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidPhone types", () => {
	test("should take a string, optional options, and return a boolean", () => {
		expectTypeOf(isValidPhone).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidPhone).parameter(1).toEqualTypeOf<IsValidPhoneOptions | undefined>();
		expectTypeOf(isValidPhone).returns.toEqualTypeOf<boolean>();
	});

	test("should restrict version and accept to the documented values", () => {
		expectTypeOf<IsValidPhoneOptions["version"]>().toEqualTypeOf<PhoneVersion | undefined>();
		expectTypeOf<IsValidPhoneOptions["accept"]>().toEqualTypeOf<PhoneType[] | undefined>();
		expectTypeOf<PhoneVersion>().toEqualTypeOf<1 | 2>();
		expectTypeOf<PhoneType>().toEqualTypeOf<"mobile" | "landline" | "service">();
	});
});
