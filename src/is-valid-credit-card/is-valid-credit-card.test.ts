import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCreditCard } from "./is-valid-credit-card";

describe("isValidCreditCard", () => {
	describe("should return true", () => {
		test("for the Visa test number 4111111111111111", () => {
			expect(isValidCreditCard("4111111111111111")).toBe(true);
		});

		test("for the Mastercard test number 5555555555554444", () => {
			expect(isValidCreditCard("5555555555554444")).toBe(true);
		});

		test("for the American Express test number 378282246310005 (15 digits)", () => {
			expect(isValidCreditCard("378282246310005")).toBe(true);
		});

		test("for the Discover test number 6011111111111117", () => {
			expect(isValidCreditCard("6011111111111117")).toBe(true);
		});

		test("for a number input", () => {
			expect(isValidCreditCard(4_111_111_111_111_111)).toBe(true);
		});

		test("for a value with a spaced mask", () => {
			expect(isValidCreditCard("4111 1111 1111 1111")).toBe(true);
		});

		test("for a value with a hyphenated mask", () => {
			expect(isValidCreditCard("4111-1111-1111-1111")).toBe(true);
		});

		test("for the shortest accepted length (12 digits)", () => {
			expect(isValidCreditCard("601100000004")).toBe(true);
		});

		test("for the longest accepted length (19 digits)", () => {
			expect(isValidCreditCard("1234567890123456785")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the check digit does not match", () => {
			expect(isValidCreditCard("4111111111111112")).toBe(false);
		});

		test("when it has fewer than 12 digits (11 digits)", () => {
			expect(isValidCreditCard("60110000000")).toBe(false);
		});

		test("when it has more than 19 digits (20 digits)", () => {
			expect(isValidCreditCard("12345678901234567850")).toBe(false);
		});

		test("when it has more than 19 digits and would still pass the Luhn check on its own", () => {
			expect(isValidCreditCard("00000000000000000000")).toBe(false);
		});

		test("when it has fewer than 12 digits and would still pass the Luhn check on its own", () => {
			expect(isValidCreditCard("0")).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCreditCard("")).toBe(false);
		});

		test("when it contains only letters", () => {
			expect(isValidCreditCard("abcdabcdabcd")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCreditCard([])).toBe(false);
		});
	});
});
