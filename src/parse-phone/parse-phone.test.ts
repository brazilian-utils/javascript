import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generatePhone } from "../generate-phone/generate-phone";
import { parsePhone } from "./parse-phone";

describe("parsePhone", () => {
	it("should remove phone mask characters", () => {
		expect(parsePhone("(11) 98888-7777")).toBe("11988887777");
		expect(parsePhone("98888-7777")).toBe("988887777");
	});

	it("should remove non numeric characters", () => {
		expect(parsePhone("+55 (11) 98888-7777")).toBe("11988887777");
	});

	it("should ignore digits after the phone length", () => {
		expect(parsePhone("11988887777123")).toBe("11988887777");
	});

	it("should remove the country code from every international notation", () => {
		expect(parsePhone("+5511988887777")).toBe("11988887777");
		expect(parsePhone("+55 11 98888-7777")).toBe("11988887777");
		expect(parsePhone("5511988887777")).toBe("11988887777");
		expect(parsePhone("005511988887777")).toBe("11988887777");
		expect(parsePhone("+55 (11) 3000-0000")).toBe("1130000000");
		expect(parsePhone("551130000000")).toBe("1130000000");
	});

	it("should keep a leading 55 that is an area code", () => {
		expect(parsePhone("55988887777")).toBe("55988887777");
		expect(parsePhone("(55) 3000-0000")).toBe("5530000000");
		expect(parsePhone("+55 (55) 98888-7777")).toBe("55988887777");
	});

	it("should keep the digits when the country code leaves an implausible number", () => {
		expect(parsePhone("55123")).toBe("55123");
	});

	it("should keep service numbers untouched", () => {
		expect(parsePhone("0800 123 4567")).toBe("08001234567");
		expect(parsePhone("4004-1234")).toBe("40041234");
		expect(parsePhone("190")).toBe("190");
	});

	it("should return an empty string for nullish values", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parsePhone(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parsePhone()).toBe("");
	});

	it("should accept numbers", () => {
		expect(parsePhone(11_988_887_777)).toBe("11988887777");
	});

	describe("properties", () => {
		test("should only ever return at most eleven digits", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const parsed = parsePhone(value);

					expect(/^\d*$/.test(parsed)).toBe(true);
					expect(parsed.length).toBeLessThanOrEqual(11);
				}),
			);
		});

		test("should be idempotent over the phone digits", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const parsed = parsePhone(value);

					expect(parsePhone(parsed)).toBe(parsed);
				}),
			);
		});

		test("should drop the country code of a generated number however it is written", () => {
			fc.assert(
				fc.property(fc.constantFrom("mobile", "landline"), (type) => {
					const phone = generatePhone(type);

					expect(parsePhone(phone)).toBe(phone);
					expect(parsePhone(`+55 ${phone}`)).toBe(phone);
					expect(parsePhone(`0055${phone}`)).toBe(phone);
				}),
			);
		});

		test("should never throw and always return the phone digits as a string", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), fc.integer(), (text, number) => {
					expect(typeof parsePhone(text)).toBe("string");
					expect(typeof parsePhone(number)).toBe("string");
				}),
			);
		});
	});
});

describe("parsePhone types", () => {
	test("should take a string or number and return a string", () => {
		expectTypeOf(parsePhone).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parsePhone).returns.toEqualTypeOf<string>();
	});
});
