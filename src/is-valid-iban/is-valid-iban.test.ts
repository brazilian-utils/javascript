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

		test("when it is an empty string", () => {
			expect(isValidIban("")).toBe(false);
		});

		test("when it contains only whitespace", () => {
			expect(isValidIban("   ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidIban(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidIban(undefined)).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(isValidIban(1500000000000)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidIban(true)).toBe(false);
			// @ts-expect-error
			expect(isValidIban(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error
			expect(isValidIban({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error
			expect(isValidIban([])).toBe(false);
		});
	});
});
