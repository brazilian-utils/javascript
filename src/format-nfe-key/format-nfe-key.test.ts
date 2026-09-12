import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatNfeKey } from "./format-nfe-key";

const KEY = "35170458716523000119550010000000121000123458";
const FORMATTED = "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458";

describe("formatNfeKey", () => {
	test("should format a full access key into groups of 4 digits", () => {
		expect(formatNfeKey(KEY)).toBe(FORMATTED);
	});

	test("should format partial values as far as they go", () => {
		expect(formatNfeKey("")).toBe("");
		expect(formatNfeKey("1")).toBe("1");
		expect(formatNfeKey("123")).toBe("123");
		expect(formatNfeKey("1234")).toBe("1234");
		expect(formatNfeKey("12345")).toBe("1234 5");
	});

	test("should NOT add digits after the access key length (44)", () => {
		expect(formatNfeKey(`${KEY}999999`)).toBe(FORMATTED);
	});

	test("should remove all non numeric characters, including the NFe prefix", () => {
		expect(formatNfeKey(`NFe${KEY}`)).toBe(FORMATTED);
		expect(formatNfeKey(FORMATTED)).toBe(FORMATTED);
	});

	test("should return an empty string for nullish input", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey()).toBe("");
	});

	test("should not throw for other bad input types", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey(123)).toBe("123");
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey({})).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey([])).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey(true)).toBe("");
	});

	describe("properties", () => {
		test("should group a full access key into eleven blocks of four digits", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{44}$/), (key) => {
					const formatted = formatNfeKey(key);

					expect(/^(?:\d{4} ){10}\d{4}$/.test(formatted)).toBe(true);
					expect(formatted.replaceAll(" ", "")).toBe(key);
				}),
			);
		});

		test("should keep only the digits of the access key it formats", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const digits = value.replaceAll(/\D/g, "").slice(0, 44);

					expect(formatNfeKey(value).replaceAll(/\D/g, "")).toBe(digits);
				}),
			);
		});

		test("should never throw and always return the access key as a string", () => {
			fc.assert(
				fc.property(
					fc.string({ unit: "grapheme" }),
					fc.stringMatching(/^[0-9]{0,60}$/),
					(text, digits) => {
						expect(typeof formatNfeKey(text)).toBe("string");
						expect(typeof formatNfeKey(digits)).toBe("string");
					},
				),
			);
		});
	});
});

describe("formatNfeKey types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(formatNfeKey).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(formatNfeKey).returns.toEqualTypeOf<string>();
	});
});
