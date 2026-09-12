import * as fc from "fast-check";

import { BANKS, type Bank } from "../_internals/constants/banks";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { getBankByCode } from "./get-bank-by-code";

describe("getBankByCode", () => {
	describe("should return null for a negative or fractional number", () => {
		test("whose digits would otherwise match a bank", () => {
			expect(getBankByCode(-1)).toBeNull();
			expect(getBankByCode(0.01)).toBeNull();
		});
	});

	describe("should return the bank", () => {
		test("when the code is a zero-padded string", () => {
			expect(getBankByCode("001")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the code is a string without leading zeros", () => {
			expect(getBankByCode("1")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the code is a number", () => {
			expect(getBankByCode(1)).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the code has a mask", () => {
			expect(getBankByCode("0-01")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("for a bank whose code has no leading zeros", () => {
			expect(getBankByCode("341")).toEqual({
				code: "341",
				ispb: "60701190",
				name: "ITAÚ UNIBANCO S.A.",
			});
		});
	});

	test("should return a fresh copy that does not affect subsequent calls when mutated", () => {
		const bank = getBankByCode("001");
		if (bank) bank.name = "mutated";
		expect(getBankByCode("001")?.name).not.toBe("mutated");
	});

	describe("should return null", () => {
		test("when no bank has that code", () => {
			expect(getBankByCode("999")).toBeNull();
		});

		test("when the code is longer than 3 digits", () => {
			expect(getBankByCode("00001")).toBeNull();
		});

		test("when the code sanitizes to an empty string", () => {
			expect(getBankByCode("abc")).toBeNull();
		});

		test("when the code is an empty string", () => {
			expect(getBankByCode("")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode()).toBeNull();
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode(true)).toBeNull();
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode({})).toBeNull();
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode([])).toBeNull();
		});

		test("when it is an array whose string form would otherwise resolve to a real code", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByCode([1])).toBeNull();
		});
	});

	describe("properties", () => {
		const banks = fc.constantFrom(...BANKS);

		test("should find every bank of the table by its COMPE code", () => {
			fc.assert(
				fc.property(banks, (bank) => {
					expect(getBankByCode(bank.code)?.code).toBe(bank.code);
					expect(getBankByCode(Number(bank.code))?.code).toBe(bank.code);
				}),
			);
		});

		test("should hand out a copy that cannot change the table", () => {
			fc.assert(
				fc.property(banks, (bank) => {
					const found = getBankByCode(bank.code);

					expect(found).not.toBe(bank);
					expect(found?.name).toBe(bank.name);
				}),
			);
		});

		test("should never throw and always return a bank or null for a code", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const found = getBankByCode(value as string);

					expect(found === null || typeof found.code === "string").toBe(true);
				}),
			);
		});
	});
});

describe("getBankByCode types", () => {
	test("should take a string or number and return a bank or null", () => {
		expectTypeOf(getBankByCode).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getBankByCode).returns.toEqualTypeOf<Bank | null>();
		expectTypeOf<Bank>().toEqualTypeOf<{ code: string; ispb: string; name: string }>();
	});
});
