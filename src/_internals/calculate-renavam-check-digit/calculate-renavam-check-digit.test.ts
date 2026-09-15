import { describe, expect, test } from "../test/runtime";
import { calculateRenavamCheckDigit } from "./calculate-renavam-check-digit";

describe("calculateRenavamCheckDigit", () => {
	test("should return 2 for the base of 00639884962 (klawdyo/validation-br renavam fixture)", () => {
		expect(calculateRenavamCheckDigit("0063988496")).toBe(2);
	});

	test("should return 0 for the base of 12345678900, where the multiplier wraps from 9 back to 2", () => {
		expect(calculateRenavamCheckDigit("1234567890")).toBe(0);
	});

	test("should return 0 when the product leaves a remainder of 10 (base of 00000000060)", () => {
		expect(calculateRenavamCheckDigit("0000000006")).toBe(0);
	});

	test("should return 1 for the base of 00000000051, where only the rightmost digit weighs", () => {
		expect(calculateRenavamCheckDigit("0000000005")).toBe(1);
	});

	test("should return 6 for the base of 90000000006, where only the leftmost digit weighs", () => {
		expect(calculateRenavamCheckDigit("9000000000")).toBe(6);
	});

	test("should return 0 for a base of only zeros", () => {
		expect(calculateRenavamCheckDigit("0000000000")).toBe(0);
	});
});
