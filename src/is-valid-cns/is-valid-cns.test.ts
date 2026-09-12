import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCns } from "./is-valid-cns";

describe("isValidCns", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidCns(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidCns(undefined)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidCns(true)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error
			expect(isValidCns({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error
			expect(isValidCns([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCns("")).toBe(false);
		});

		test("when it does not have 15 digits", () => {
			expect(isValidCns("12345678901")).toBe(false);
		});

		test("when the first digit is not 1, 2, 7, 8 or 9", () => {
			expect(isValidCns("312345678901234")).toBe(false);
			expect(isValidCns("012345678901234")).toBe(false);
			expect(isValidCns("612345678901234")).toBe(false);
		});

		test("when a definitive card has the wrong check digit", () => {
			expect(isValidCns("123456789010001")).toBe(false);
		});

		test("when a definitive card carries the 001 suffix without needing the +2 adjustment", () => {
			expect(isValidCns("123456789010010")).toBe(false);
		});

		test("when a definitive card whose raw check digit is 10 (base 10000000006) keeps the 000 suffix", () => {
			expect(isValidCns("100000000060000")).toBe(false);
			expect(isValidCns("100000000060008")).toBe(false);
		});

		test("when a provisional card's weighted sum is not a multiple of 11", () => {
			expect(isValidCns("700000000000001")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for a definitive CNS whose raw check digit does not need the +2 adjustment (base 12345678901, weighted sum 440, suffix 000, digit 0)", () => {
			expect(isValidCns("123456789010000")).toBe(true);
		});

		test("for a definitive CNS starting with 2 (base 20000000001, weighted sum 35, digit 9)", () => {
			expect(isValidCns("200000000010009")).toBe(true);
		});

		test("for a definitive CNS as a number", () => {
			expect(isValidCns(123456789010000)).toBe(true);
		});

		test("for a definitive CNS with a whitespace mask", () => {
			expect(isValidCns("123 4567 8901 0000")).toBe(true);
		});

		test("for a definitive CNS whose raw check digit is 10 (base 10000000006, weighted sum 45): sum raised to 47, digit 8, suffix 001", () => {
			expect(isValidCns("100000000060018")).toBe(true);
		});

		test("for a provisional CNS starting with 7", () => {
			expect(isValidCns("700000000000005")).toBe(true);
		});

		test("for a provisional CNS starting with 8", () => {
			expect(isValidCns("800000000000001")).toBe(true);
		});

		test("for a provisional CNS starting with 9", () => {
			expect(isValidCns("900000000000008")).toBe(true);
		});
	});
});
