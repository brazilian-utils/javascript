import { describe, expect, test } from "../_internals/test/runtime";
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
});
