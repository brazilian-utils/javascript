import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generatePhone } from "../generate-phone/generate-phone";
import { parsePhone } from "../parse-phone/parse-phone";
import { type FormatPhoneOptions, type PhoneMask, formatPhone } from "./format-phone";

describe("formatPhone", () => {
	it("should format a service number written with an explicit country code", () => {
		expect(formatPhone("005540041234", { mask: "e164" })).toBe("4004-1234");
		expect(formatPhone("+55 0800 123 4567", { mask: "auto" })).toBe("0800 123 4567");
		expect(formatPhone("+55 190", { mask: "service" })).toBe("190");
		expect(formatPhone("55 4004-1234", { mask: "e164" })).toBe("+555540041234");
	});

	it("should sn format phone", () => {
		expect(formatPhone("")).toBe("");
		expect(formatPhone("9")).toBe("9");
		expect(formatPhone("98")).toBe("98");
		expect(formatPhone("988")).toBe("988");
		expect(formatPhone("9888")).toBe("9888");
		expect(formatPhone("98888")).toBe("98888");
		expect(formatPhone("988887")).toBe("98888-7");
		expect(formatPhone("9888877")).toBe("98888-77");
		expect(formatPhone("98888777")).toBe("98888-777");
		expect(formatPhone("988887777")).toBe("98888-7777");
	});

	it("should nanp format phone", () => {
		expect(formatPhone("", { mask: "nanp" })).toBe("");
		expect(formatPhone("1", { mask: "nanp" })).toBe("(1");
		expect(formatPhone("11", { mask: "nanp" })).toBe("(11");
		expect(formatPhone("119", { mask: "nanp" })).toBe("(11) 9");
		expect(formatPhone("1198", { mask: "nanp" })).toBe("(11) 98");
		expect(formatPhone("11988", { mask: "nanp" })).toBe("(11) 988");
		expect(formatPhone("119888", { mask: "nanp" })).toBe("(11) 9888");
		expect(formatPhone("1198888", { mask: "nanp" })).toBe("(11) 98888");
		expect(formatPhone("11988887", { mask: "nanp" })).toBe("(11) 98888-7");
		expect(formatPhone("119888877", { mask: "nanp" })).toBe("(11) 98888-77");
		expect(formatPhone("1198888777", { mask: "nanp" })).toBe("(11) 98888-777");
		expect(formatPhone("11988887777", { mask: "nanp" })).toBe("(11) 98888-7777");
	});

	it("should auto format phone", () => {
		expect(formatPhone("", { mask: "auto" })).toBe("");
		expect(formatPhone("1", { mask: "auto" })).toBe("1");
		expect(formatPhone("11", { mask: "auto" })).toBe("11");
		expect(formatPhone("119", { mask: "auto" })).toBe("119");
		expect(formatPhone("1198", { mask: "auto" })).toBe("1198");
		expect(formatPhone("11988", { mask: "auto" })).toBe("11988");
		expect(formatPhone("119888", { mask: "auto" })).toBe("11988-8");
		expect(formatPhone("1198888", { mask: "auto" })).toBe("11988-88");
		expect(formatPhone("11988887", { mask: "auto" })).toBe("11988-887");
		expect(formatPhone("119888877", { mask: "auto" })).toBe("11988-8877");
		expect(formatPhone("1198888777", { mask: "auto" })).toBe("(11) 98888-777");
		expect(formatPhone("11988887777", { mask: "auto" })).toBe("(11) 98888-7777");
	});

	it("should e164 format phone", () => {
		expect(formatPhone("", { mask: "e164" })).toBe("");
		expect(formatPhone("11988887777", { mask: "e164" })).toBe("+5511988887777");
		expect(formatPhone("(11) 98888-7777", { mask: "e164" })).toBe("+5511988887777");
		expect(formatPhone("1130000000", { mask: "e164" })).toBe("+551130000000");
		expect(formatPhone("+55 11 98888-7777", { mask: "e164" })).toBe("+5511988887777");
		expect(formatPhone("005511988887777", { mask: "e164" })).toBe("+5511988887777");
		expect(formatPhone("5511988887777", { mask: "e164" })).toBe("+5511988887777");
		expect(formatPhone("0800 123 4567", { mask: "e164" })).toBe("0800 123 4567");
		expect(formatPhone("+55 0800 123 4567", { mask: "e164" })).toBe("0800 123 4567");
		expect(formatPhone("+55 0800 123 4567", { mask: "international" })).toBe("0800 123 4567");
		expect(formatPhone("55988887777", { mask: "e164" })).toBe("+5555988887777");
		expect(formatPhone(11_988_887_777, { mask: "e164" })).toBe("+5511988887777");
	});

	it("should international format phone", () => {
		expect(formatPhone("", { mask: "international" })).toBe("");
		expect(formatPhone("11988887777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("(11) 98888-7777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("1130000000", { mask: "international" })).toBe("+55 11 3000-0000");
		expect(formatPhone("+55 (11) 98888-7777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("005511988887777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("55988887777", { mask: "international" })).toBe("+55 55 98888-7777");
	});

	it("should service format phone", () => {
		expect(formatPhone("", { mask: "service" })).toBe("");
		expect(formatPhone("08001234567", { mask: "service" })).toBe("0800 123 4567");
		expect(formatPhone("0800 123 4567", { mask: "service" })).toBe("0800 123 4567");
		expect(formatPhone("03001234567", { mask: "service" })).toBe("0300 123 4567");
		expect(formatPhone("03031234567", { mask: "service" })).toBe("0303 123 4567");
		expect(formatPhone("05001234567", { mask: "service" })).toBe("0500 123 4567");
		expect(formatPhone("09001234567", { mask: "service" })).toBe("0900 123 4567");
		expect(formatPhone("40041234", { mask: "service" })).toBe("4004-1234");
		expect(formatPhone("30031234", { mask: "service" })).toBe("3003-1234");
		expect(formatPhone("190", { mask: "service" })).toBe("190");
	});

	it("should not apply the abbreviated mask to a number that matches neither the non-geographic nor the abbreviated roots", () => {
		expect(formatPhone("55555", { mask: "service" })).toBe("55555");
		expect(formatPhone("12345678", { mask: "service" })).toBe("12345678");
	});

	it("should service format phone while it is being typed", () => {
		expect(formatPhone("0", { mask: "service" })).toBe("0");
		expect(formatPhone("0800", { mask: "service" })).toBe("0800");
		expect(formatPhone("08001", { mask: "service" })).toBe("0800 1");
		expect(formatPhone("0800123", { mask: "service" })).toBe("0800 123");
		expect(formatPhone("08001234", { mask: "service" })).toBe("0800 123 4");
		expect(formatPhone("4004", { mask: "service" })).toBe("4004");
		expect(formatPhone("40041", { mask: "service" })).toBe("4004-1");
	});

	it("should detect a country code under the auto mask", () => {
		expect(formatPhone("+55 11 98888-7777", { mask: "auto" })).toBe("+55 11 98888-7777");
		expect(formatPhone("+5511988887777", { mask: "auto" })).toBe("+55 11 98888-7777");
		expect(formatPhone("005511988887777", { mask: "auto" })).toBe("+55 11 98888-7777");
		expect(formatPhone("+55 11 3000-0000", { mask: "auto" })).toBe("+55 11 3000-0000");
	});

	it("should detect a service number under the auto mask", () => {
		expect(formatPhone("08001234567", { mask: "auto" })).toBe("0800 123 4567");
		expect(formatPhone("03001234567", { mask: "auto" })).toBe("0300 123 4567");
		expect(formatPhone("40041234", { mask: "auto" })).toBe("4004-1234");
		expect(formatPhone("30031234", { mask: "auto" })).toBe("3003-1234");
	});

	it("should keep reading the DDD from a bare 55 area code under the auto mask", () => {
		expect(formatPhone("55988887777", { mask: "auto" })).toBe("(55) 98888-7777");
	});

	it("should format international and service numbers when asked explicitly", () => {
		expect(formatPhone("+55 11 98888-7777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("+5511988887777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("005511988887777", { mask: "international" })).toBe("+55 11 98888-7777");
		expect(formatPhone("+55 11 3000-0000", { mask: "international" })).toBe("+55 11 3000-0000");
		expect(formatPhone("08001234567", { mask: "service" })).toBe("0800 123 4567");
		expect(formatPhone("40041234", { mask: "service" })).toBe("4004-1234");
	});

	it("should keep international masks on service numbers", () => {
		expect(formatPhone("08001234567", { mask: "e164" })).toBe("0800 123 4567");
		expect(formatPhone("40041234", { mask: "international" })).toBe("4004-1234");
	});

	it("should return an empty string for nullish values", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatPhone(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatPhone()).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatPhone(null, { mask: "e164" })).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatPhone(undefined, { mask: "service" })).toBe("");
	});

	describe("properties", () => {
		const geographic = ["mobile", "landline"] as const;

		test("should print a generated number in E.164 and read it back", () => {
			fc.assert(
				fc.property(fc.constantFrom(...geographic), (type) => {
					const phone = generatePhone(type);
					const formatted = formatPhone(phone, { mask: "e164" });

					expect(formatted).toBe(`+55${phone}`);
					expect(parsePhone(formatted)).toBe(phone);
				}),
			);
		});

		test("should keep every digit of a generated number under the auto mask", () => {
			fc.assert(
				fc.property(fc.constantFrom(...geographic), (type) => {
					const phone = generatePhone(type);
					const international = formatPhone(phone, { mask: "international" });

					expect(parsePhone(formatPhone(phone, { mask: "auto" }))).toBe(phone);
					expect(international.startsWith("+55 ")).toBe(true);
					expect(parsePhone(international)).toBe(phone);
				}),
			);
		});

		test("should keep the digits a national mask has room for", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const digits = value.replaceAll(/\D/g, "");

					expect(formatPhone(value).replaceAll(/\D/g, "")).toBe(digits.slice(0, 9));
					expect(formatPhone(value, { mask: "nanp" }).replaceAll(/\D/g, "")).toBe(
						digits.slice(0, 11),
					);
				}),
			);
		});

		test("should never throw and always return the phone number as a string", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), fc.integer(), (text, number) => {
					expect(typeof formatPhone(text)).toBe("string");
					expect(typeof formatPhone(number)).toBe("string");
				}),
			);
		});
	});
});

describe("formatPhone types", () => {
	test("should take a string or number, optional options, and return a string", () => {
		expectTypeOf(formatPhone).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatPhone).parameter(1).toEqualTypeOf<FormatPhoneOptions | undefined>();
		expectTypeOf(formatPhone).returns.toEqualTypeOf<string>();
	});

	test("should restrict mask to the supported phone masks", () => {
		expectTypeOf<FormatPhoneOptions["mask"]>().toEqualTypeOf<PhoneMask | undefined>();
		expectTypeOf<PhoneMask>().toEqualTypeOf<
			"auto" | "e164" | "international" | "service" | "sn" | "nanp"
		>();
	});
});
