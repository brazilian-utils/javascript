import * as fc from "fast-check";

import { BANKS, type Bank } from "../_internals/constants/banks";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { getBankByIspb } from "./get-bank-by-ispb";

describe("getBankByIspb", () => {
	describe("should return null for a negative or fractional number", () => {
		test("whose digits would otherwise match a bank", () => {
			expect(getBankByIspb(-208)).toBeNull();
			expect(getBankByIspb(2.08)).toBeNull();
		});

		test("but still resolve zero, the ISPB of Banco do Brasil", () => {
			expect(getBankByIspb(0)?.code).toBe("001");
		});
	});

	describe("should return the bank", () => {
		test("when the ispb is a zero-padded string", () => {
			expect(getBankByIspb("00000000")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the ispb is a string without leading zeros", () => {
			expect(getBankByIspb("0")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the ispb is a number", () => {
			expect(getBankByIspb(0)).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("when the ispb has a mask", () => {
			expect(getBankByIspb("0000-0000")).toEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("for a bank whose ispb has no leading zeros", () => {
			expect(getBankByIspb("60701190")).toEqual({
				code: "341",
				ispb: "60701190",
				name: "ITAÚ UNIBANCO S.A.",
			});
		});
	});

	test("should return a fresh copy that does not affect subsequent calls when mutated", () => {
		const bank = getBankByIspb("00000000");
		if (bank) bank.name = "mutated";
		expect(getBankByIspb("00000000")?.name).not.toBe("mutated");
	});

	describe("should return null", () => {
		test("when no bank has that ispb", () => {
			expect(getBankByIspb("99999999")).toBeNull();
		});

		test("when the ispb is longer than 8 digits", () => {
			expect(getBankByIspb("0000000000")).toBeNull();
		});

		test("when the ispb sanitizes to an empty string", () => {
			expect(getBankByIspb("abc")).toBeNull();
		});

		test("when the ispb is an empty string", () => {
			expect(getBankByIspb("")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb()).toBeNull();
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb(true)).toBeNull();
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb({})).toBeNull();
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb([])).toBeNull();
		});

		test("when it is an array whose string form would otherwise resolve to a real ispb", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getBankByIspb([0])).toBeNull();
		});
	});

	describe("properties", () => {
		const banks = fc.constantFrom(...BANKS);

		test("should find a participant for the ISPB of every bank of the table", () => {
			fc.assert(
				fc.property(banks, (bank) => {
					expect(getBankByIspb(bank.ispb)?.ispb).toBe(bank.ispb);
					expect(getBankByIspb(Number(bank.ispb))?.ispb).toBe(bank.ispb);
				}),
			);
		});

		test("should return null for an ISPB longer than the eight digits of the register", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{9,20}$/), (value) => {
					expect(getBankByIspb(value)).toBeNull();
				}),
			);
		});

		test("should never throw and always return a bank or null for an ISPB", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const found = getBankByIspb(value as string);

					expect(found === null || typeof found.ispb === "string").toBe(true);
				}),
			);
		});
	});
});

describe("getBankByIspb types", () => {
	test("should take a string or number and return a bank or null", () => {
		expectTypeOf(getBankByIspb).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getBankByIspb).returns.toEqualTypeOf<Bank | null>();
		expectTypeOf<Bank>().toEqualTypeOf<{ code: string; ispb: string; name: string }>();
	});
});
