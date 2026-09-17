import { describe, expect, test } from "../test/runtime";
import { mod11 } from "./mod11";

const mod11Arrecadacao = (value: string) => mod11(value, { variant: "arrecadacao" });

const mod11Bank = (value: string, maxWeight?: number) =>
	mod11(value, maxWeight === undefined ? { variant: "bank" } : { variant: "bank", maxWeight });

describe("mod11", () => {
	describe("default variant (boleto)", () => {
		test("should return a digit between 1 and 9 for any input", () => {
			const values = ["0019", "123", "0019000009011497186016852452211467586000010265"];

			for (const value of values) {
				expect(mod11(value)).toBeGreaterThanOrEqual(1);
				expect(mod11(value)).toBeLessThanOrEqual(9);
			}
		});

		test("should return 1 when the weighted sum leaves remainder 0 (sum 0 for '0')", () => {
			expect(mod11("0")).toBe(1);
		});

		test("should return 1 when the weighted sum leaves remainder 10 ('19' = 1*3 + 9*2 = 21)", () => {
			expect(mod11("19")).toBe(1);
		});

		test("should compute the DV geral of a real boleto barcode with its 5th position removed", () => {
			expect(mod11("0019758600001026560000001149718606852452211")).toBe(6);
		});
	});

	describe("arrecadacao variant", () => {
		test("should reproduce the FEBRABAN field example (§09): sum 176, remainder 0 gives 0", () => {
			expect(mod11Arrecadacao("01230067896")).toBe(0);
		});

		test("should reproduce the FEBRABAN DV geral example (§10): sum 705, remainder 1 gives 0", () => {
			expect(mod11Arrecadacao("8220000215048200974123220154098290108605940")).toBe(0);
		});

		test("should return 0 when the remainder is 0", () => {
			expect(mod11Arrecadacao("0")).toBe(0);
		});

		test("should return 1 when the remainder is 10 ('19' = 21, '5' = 10)", () => {
			expect(mod11Arrecadacao("19")).toBe(1);
			expect(mod11Arrecadacao("5")).toBe(1);
		});

		test("should return 11 minus the remainder for the other cases ('1' -> 9, '2' -> 7)", () => {
			expect(mod11Arrecadacao("1")).toBe(9);
			expect(mod11Arrecadacao("2")).toBe(7);
		});

		test("should map remainder 0 to 0 while the boleto variant maps it to 1", () => {
			expect(mod11Arrecadacao("0")).toBe(0);
			expect(mod11("0")).toBe(1);
		});
	});

	describe("bank variant", () => {
		test("should compute a Banco do Brasil account digit (00210169 -> sum 60, remainder 5, digit 6)", () => {
			expect(mod11Bank("00210169")).toBe(6);
		});

		test("should return 0 when the remainder is 0 (10089939 -> sum 165)", () => {
			expect(mod11Bank("10089939")).toBe(0);
		});

		test("should return 10 when the remainder is 1, which banks render as 'X' or 'P'", () => {
			expect(mod11Bank("10089934")).toBe(10);
			expect(mod11Bank("00189062")).toBe(10);
		});

		test("should honor a custom max weight (Bradesco wraps the weights at 7)", () => {
			expect(mod11Bank("0238069", 7)).toBe(2);
			expect(mod11Bank("0301357", 7)).toBe(10);
			expect(mod11Bank("0325620", 7)).toBe(0);
			expect(mod11Bank("0284025", 7)).toBe(1);
		});

		test("should not fall back to the boleto digit 1 for remainder 0", () => {
			expect(mod11Bank("10089939")).not.toBe(1);
		});
	});
});
