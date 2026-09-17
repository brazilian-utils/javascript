import { describe, expect, test } from "../test/runtime";
import { calculatePisCheckDigit } from "./calculate-pis-check-digit";

describe("calculatePisCheckDigit", () => {
	test("should return 0 when the weighted sum is a multiple of 11 (base of 12345678900)", () => {
		expect(calculatePisCheckDigit("1234567890")).toBe(0);
		expect(calculatePisCheckDigit("0000000000")).toBe(0);
	});

	test("should return 1 when the weighted sum leaves a remainder of 10 (base of 00000000051)", () => {
		expect(calculatePisCheckDigit("0000000005")).toBe(1);
	});

	test("should return 9 when the weighted sum leaves a remainder of 2 (base of 00000000019)", () => {
		expect(calculatePisCheckDigit("0000000001")).toBe(9);
	});

	test("should weigh the leftmost digit by 3 and the rightmost by 2", () => {
		expect(calculatePisCheckDigit("1000000000")).toBe(8);
		expect(calculatePisCheckDigit("0000000001")).toBe(9);
	});

	test("should read only the ten base digits", () => {
		expect(calculatePisCheckDigit("12345678900")).toBe(0);
		expect(calculatePisCheckDigit("12345678909")).toBe(0);
	});
});
