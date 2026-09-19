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

	it("should format a service number written with a bare country code", () => {
		expect(formatPhone("5508001234567", { mask: "auto" })).toBe("0800 123 4567");
		expect(formatPhone("5508001234567", { mask: "e164" })).toBe("0800 123 4567");
		expect(formatPhone("5508001234567", { mask: "international" })).toBe("0800 123 4567");
		expect(formatPhone("5508001234567", { mask: "service" })).toBe("0800 123 4567");
		expect(formatPhone("55 0300 123 4567", { mask: "auto" })).toBe("0300 123 4567");
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
		expect(formatPhone("1198888777", { mask: "nanp" })).toBe("(11) 9888-8777");
		expect(formatPhone("11988887777", { mask: "nanp" })).toBe("(11) 98888-7777");
	});

	it("should group a complete 10 digit landline as (00) 0000-0000", () => {
		expect(formatPhone("1130000000", { mask: "nanp" })).toBe("(11) 3000-0000");
		expect(formatPhone("1130000000", { mask: "auto" })).toBe("(11) 3000-0000");
		expect(formatPhone("(11) 3000-0000", { mask: "nanp" })).toBe("(11) 3000-0000");
	});

	it("should keep the 9 digit sn grouping for a 10 digit value, which only nanp reads as a landline", () => {
		expect(formatPhone("1130000000")).toBe("11300-0000");
		expect(formatPhone("1130000000", { mask: "sn" })).toBe("11300-0000");
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
		expect(formatPhone("1198888777", { mask: "auto" })).toBe("(11) 9888-8777");
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

	it("should fall back to the default mask when mask is outside the union", () => {
		// @ts-expect-error: intentionally invalid mask
		expect(formatPhone("988887777", { mask: "bogus" })).toBe("98888-7777");
		// @ts-expect-error: intentionally invalid mask
		expect(formatPhone("11988887777", { mask: "bogus" })).toBe("11988-8877");
	});

	it("should hide the subscriber number except its last 2 digits under the national masks", () => {
		expect(formatPhone("988887766", { obfuscate: true })).toBe("*****-**66");
		expect(formatPhone(988_887_766, { obfuscate: true })).toBe("*****-**66");
		expect(formatPhone("11988887766", { mask: "nanp", obfuscate: true })).toBe("(11) *****-**66");
		expect(formatPhone("1130001234", { mask: "nanp", obfuscate: true })).toBe("(11) ****-**34");
		expect(formatPhone("11988887766", { mask: "auto", obfuscate: true })).toBe("(11) *****-**66");
		expect(formatPhone("1130001234", { mask: "auto", obfuscate: true })).toBe("(11) ****-**34");
		expect(formatPhone("988887766", { mask: "auto", obfuscate: true })).toBe("*****-**66");
	});

	it("should keep the country code and the DDD when obfuscating the international masks", () => {
		expect(formatPhone("11988887766", { mask: "international", obfuscate: true })).toBe(
			"+55 11 *****-**66",
		);
		expect(formatPhone("+55 11 3000-1234", { mask: "international", obfuscate: true })).toBe(
			"+55 11 ****-**34",
		);
		expect(formatPhone("5511988887766", { mask: "auto", obfuscate: true })).toBe(
			"+55 11 *****-**66",
		);
		expect(formatPhone("11988887766", { mask: "e164", obfuscate: true })).toBe("+5511*******66");
		expect(formatPhone("1130001234", { mask: "e164", obfuscate: true })).toBe("+5511******34");
	});

	it("should keep the service prefix and the last 2 digits when obfuscating a service number", () => {
		expect(formatPhone("08001234567", { mask: "service", obfuscate: true })).toBe("0800 *** **67");
		expect(formatPhone("03031234567", { mask: "auto", obfuscate: true })).toBe("0303 *** **67");
		expect(formatPhone("40041234", { mask: "service", obfuscate: true })).toBe("4004-**34");
		expect(formatPhone("30031234", { mask: "auto", obfuscate: true })).toBe("3003-**34");
		expect(formatPhone("08001234567", { mask: "e164", obfuscate: true })).toBe("0800 *** **67");
		expect(formatPhone("40041234", { mask: "international", obfuscate: true })).toBe("4004-**34");
	});

	it("should return a public utility code whole when obfuscating", () => {
		expect(formatPhone("190", { mask: "service", obfuscate: true })).toBe("190");
		expect(formatPhone("190", { mask: "auto", obfuscate: true })).toBe("190");
	});

	it("should hide entirely a value the service mask does not recognize when obfuscating", () => {
		expect(formatPhone("11988887766", { mask: "service", obfuscate: true })).toBe("***********");
		expect(formatPhone("08", { mask: "service", obfuscate: true })).toBe("**");
		expect(formatPhone("11988887766", { mask: "service" })).toBe("11988887766");
	});

	it("should obfuscate a partial value as far as it goes", () => {
		expect(formatPhone("1198", { mask: "nanp", obfuscate: true })).toBe("(11) **");
		expect(formatPhone("11988", { mask: "international", obfuscate: true })).toBe("+55 11 ***");
		expect(formatPhone("0800123", { mask: "service", obfuscate: true })).toBe("0800 ***");
		expect(formatPhone("", { mask: "e164", obfuscate: true })).toBe("");
		expect(formatPhone("", { mask: "international", obfuscate: true })).toBe("");
		expect(formatPhone("", { mask: "service", obfuscate: true })).toBe("");
	});

	it("should drop what does not fit the 11 national digits when obfuscating the e164 mask", () => {
		expect(formatPhone("119888877660000", { mask: "e164", obfuscate: true })).toBe(
			"+5511*******66",
		);
		expect(formatPhone("119888877660000", { mask: "e164" })).toBe("+55119888877660000");
	});

	it("should obfuscate on any truthy obfuscate value", () => {
		// @ts-expect-error: intentionally not a boolean
		expect(formatPhone("11988887766", { mask: "nanp", obfuscate: 1 })).toBe("(11) *****-**66");
		// @ts-expect-error: intentionally not a boolean
		expect(formatPhone("11988887766", { mask: "e164", obfuscate: "yes" })).toBe("+5511*******66");
	});

	it("should behave exactly as without the option when obfuscate is falsy or absent", () => {
		expect(formatPhone("11988887766", { mask: "nanp", obfuscate: false })).toBe("(11) 98888-7766");
		expect(formatPhone("11988887766", { mask: "e164", obfuscate: false })).toBe("+5511988887766");
		expect(formatPhone("08001234567", { mask: "service", obfuscate: false })).toBe("0800 123 4567");
		// @ts-expect-error: intentionally not a boolean
		expect(formatPhone("11988887766", { mask: "international", obfuscate: 0 })).toBe(
			"+55 11 98888-7766",
		);
		// @ts-expect-error: intentionally not a boolean
		expect(formatPhone("988887766", { obfuscate: null })).toBe("98888-7766");
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

		test("should show only the DDD and the last 2 digits of a generated number when obfuscating", () => {
			fc.assert(
				fc.property(fc.constantFrom(...geographic), (type) => {
					const phone = generatePhone(type);
					const visible = `${phone.slice(0, 2)}${phone.slice(-2)}`;
					const obfuscated = formatPhone(phone, { mask: "auto", obfuscate: true });

					expect(obfuscated).toMatch(/^\(\d{2}\) \*{4,5}-\*{2}\d{2}$/);
					expect(obfuscated.replaceAll(/\D/g, "")).toBe(visible);
					expect(obfuscated).toHaveLength(formatPhone(phone, { mask: "auto" }).length);
					expect(formatPhone(phone, { mask: "e164", obfuscate: true })).toMatch(
						/^\+55\d{2}\*{6,7}\d{2}$/,
					);
				}),
			);
		});

		test("should never throw and always return the phone number as a string", () => {
			fc.assert(
				fc.property(
					fc.string({ unit: "grapheme" }),
					fc.integer(),
					fc.anything(),
					(text, number, options) => {
						expect(typeof formatPhone(text)).toBe("string");
						expect(typeof formatPhone(number)).toBe("string");
						expect(typeof formatPhone(text, { mask: "auto", obfuscate: true })).toBe("string");
						// @ts-expect-error: intentionally invalid options
						expect(typeof formatPhone(text, options)).toBe("string");
					},
				),
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

	test("should type the obfuscate option as an optional boolean", () => {
		expectTypeOf<FormatPhoneOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
	});
});
