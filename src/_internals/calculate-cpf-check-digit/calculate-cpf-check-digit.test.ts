import { describe, expect, test } from "../test/runtime";
import { calculateCpfCheckDigit } from "./calculate-cpf-check-digit";

describe("calculateCpfCheckDigit", () => {
	test("should return the two check digits of 12345678909", () => {
		expect(calculateCpfCheckDigit("123456789")).toBe(0);
		expect(calculateCpfCheckDigit("1234567890")).toBe(9);
	});

	test("should return the two check digits of 52998224725", () => {
		expect(calculateCpfCheckDigit("529982247")).toBe(2);
		expect(calculateCpfCheckDigit("5299822472")).toBe(5);
	});

	test("should return 0 when the weighted sum leaves a remainder of 0 or 1", () => {
		expect(calculateCpfCheckDigit("000000000")).toBe(0);
		expect(calculateCpfCheckDigit("123456789")).toBe(0);
	});

	test("should return 9 when the weighted sum leaves a remainder of 2", () => {
		expect(calculateCpfCheckDigit("000000001")).toBe(9);
	});

	test("should return 1 when the weighted sum leaves a remainder of 10", () => {
		expect(calculateCpfCheckDigit("111111111")).toBe(1);
	});

	test("should weigh the leftmost digit by one more than the length of the base", () => {
		expect(calculateCpfCheckDigit("100000000")).toBe(1);
		expect(calculateCpfCheckDigit("1000000000")).toBe(0);
	});
});
