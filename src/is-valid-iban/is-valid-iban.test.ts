import { describe, expect, test } from "../_internals/test/runtime";
import { isValidIban } from "./is-valid-iban";

describe("isValidIban", () => {
	describe("should return true", () => {
		test("for a known valid IBAN (iban.com Brazil example)", () => {
			expect(isValidIban("BR1500000000000010932840814P2")).toBe(true);
		});

		test("for a value with grouping spaces", () => {
			expect(isValidIban("BR15 0000 0000 0000 1093 2840 814P 2")).toBe(true);
		});

		test("for a lowercase value", () => {
			expect(isValidIban("br1500000000000010932840814p2")).toBe(true);
		});

		test("for a valid IBAN with a poupança (P) account type", () => {
			expect(isValidIban("BR1460746948000020001234567P2")).toBe(true);
		});

		test("for a valid IBAN with a corrente (C) account type", () => {
			expect(isValidIban("BR3860701190000010000012345C1")).toBe(true);
		});

		test("for a valid IBAN whose owner indicator is the letter A (the LETTER_CODE_A boundary)", () => {
			expect(isValidIban("BR4500000000000010000012345CA")).toBe(true);
		});

		test("for a valid IBAN whose owner indicator is the letter Z (the highest transliterated letter)", () => {
			expect(isValidIban("BR4900000000000010000012345CZ")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the check digits do not match", () => {
			expect(isValidIban("BR1500000000000010932840814P3")).toBe(false);
		});

		test("when the country code is not BR", () => {
			expect(isValidIban("DE89370400440532013000")).toBe(false);
		});

		test("when it is shorter than 29 characters", () => {
			expect(isValidIban("BR15000000000000109328408")).toBe(false);
		});

		test("when it is longer than 29 characters", () => {
			expect(isValidIban("BR1500000000000010932840814P2000")).toBe(false);
		});

		test("when the account type is not C or P", () => {
			expect(isValidIban("BR1500000000000010932840814X2")).toBe(false);
		});

		test("when a digit position holds a letter instead, even if the check digits happen to match", () => {
			expect(isValidIban("BR170000000A000010000012345C2")).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidIban("")).toBe(false);
		});

		test("when it contains only whitespace", () => {
			expect(isValidIban("   ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban()).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban(1_500_000_000_000)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIban([])).toBe(false);
		});
	});
});
