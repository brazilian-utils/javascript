import * as fc from "fast-check";

import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows, expectPadsToLength } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatNfeKey, type FormatNfeKeyOptions } from "./format-nfe-key";

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

	describe("should left pad the value", () => {
		test("when options.pad is true", () => {
			expect(formatNfeKey("12345", { pad: true })).toBe(
				"0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345",
			);
		});

		test("keeping a complete access key untouched", () => {
			expect(formatNfeKey(KEY, { pad: true })).toBe(FORMATTED);
		});

		test("and nothing else when options.pad is false, undefined or the options object is missing", () => {
			expect(formatNfeKey("12345", { pad: false })).toBe("1234 5");
			expect(formatNfeKey("12345", {})).toBe("1234 5");
			expect(formatNfeKey("12345")).toBe("1234 5");
		});

		test("without throwing when the options object is not one", () => {
			// @ts-expect-error: intentionally invalid input
			expect(formatNfeKey("12345", null)).toBe("1234 5");
			// @ts-expect-error: intentionally invalid input
			expect(formatNfeKey("12345", "pad")).toBe("1234 5");
		});
	});

	describe("with the alphanumeric CNPJ of NT Conjunta 2025.001", () => {
		test("should keep the letters in positions 7 to 18 instead of dropping them", () => {
			expect(formatNfeKey("35260712ABC34501DE35550010000001231102030403")).toBe(
				"3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403",
			);
		});

		test("should upper case them", () => {
			expect(formatNfeKey("35260712abc34501de35550010000001231102030403")).toBe(
				"3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403",
			);
		});

		test("should keep a letter in position 7 and in position 18", () => {
			expect(formatNfeKey("352607A2ABC34501DZ35")).toBe("3526 07A2 ABC3 4501 DZ35");
		});

		test("should drop a letter in positions 1 to 6 and from position 19 on", () => {
			expect(formatNfeKey("35260A")).toBe("3526 0");
			expect(formatNfeKey("35260712ABC34501DEA5")).toBe("3526 0712 ABC3 4501 DE5");
			expect(formatNfeKey("35260712ABC34501DE3A5")).toBe("3526 0712 ABC3 4501 DE35");
		});
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
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey(-11)).toBe("11");
		// @ts-expect-error: intentionally invalid input
		expect(formatNfeKey(1.1)).toBe("11");
	});

	test("should return an empty string for an object with a null prototype, which has no toString", () => {
		expect(formatNfeKey(Object.create(null))).toBe("");
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

		test("should keep only the digits of the access key it formats when the value has no letter", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (text) => {
					const value = text.replaceAll(/[A-Za-z]/g, "");
					const digits = value.replaceAll(/\D/g, "").slice(0, 44);

					expect(formatNfeKey(value).replaceAll(/\D/g, "")).toBe(digits);
				}),
			);
		});

		test("should keep letters only in positions 7 to 18, the characters TChNFe opens to them", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(
						/^(?:\d{0,6}|\d{6}[0-9A-Z]{1,12}|\d{6}[0-9A-Z]{12}\d{1,26})$/.test(
							formatNfeKey(value).replaceAll(" ", ""),
						),
					).toBe(true);
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

		test("should left pad a shorter value up to the access key length", () => {
			expectPadsToLength(
				formatNfeKey,
				(value) => value.replaceAll(/\D/g, ""),
				fc.stringMatching(/^[0-9]{0,44}$/),
				44,
			);
		});

		test("should never throw for any garbage input", () => {
			expectNeverThrows(formatNfeKey, anyGarbage);
		});
	});
});

describe("formatNfeKey types", () => {
	test("should take a string, optional options, and return a string", () => {
		expectTypeOf(formatNfeKey).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(formatNfeKey).parameter(1).toEqualTypeOf<FormatNfeKeyOptions | undefined>();
		expectTypeOf<FormatNfeKeyOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(formatNfeKey).returns.toEqualTypeOf<string>();
	});
});
