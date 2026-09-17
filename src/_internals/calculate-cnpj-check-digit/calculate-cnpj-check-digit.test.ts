import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../constants/cnpj";
import { describe, expect, test } from "../test/runtime";
import { calculateCnpjCheckDigit } from "./calculate-cnpj-check-digit";

describe("calculateCnpjCheckDigit", () => {
	test("should return the two check digits of the numeric CNPJ 12345678000195", () => {
		expect(calculateCnpjCheckDigit("123456780001", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(9);
		expect(calculateCnpjCheckDigit("1234567800019", CNPJ_SECOND_DIGIT_WEIGHTS)).toBe(5);
	});

	test("should return the two check digits of the alphanumeric CNPJ Q0SLFMBD7VX439", () => {
		expect(calculateCnpjCheckDigit("Q0SLFMBD7VX4", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(3);
		expect(calculateCnpjCheckDigit("Q0SLFMBD7VX43", CNPJ_SECOND_DIGIT_WEIGHTS)).toBe(9);
	});

	test("should read only as many characters as there are weights", () => {
		expect(calculateCnpjCheckDigit("12345678000195", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(9);
		expect(calculateCnpjCheckDigit("12345678000195", CNPJ_SECOND_DIGIT_WEIGHTS)).toBe(5);
	});

	test("should return 0 when the weighted sum leaves a remainder of 0 or 1", () => {
		expect(calculateCnpjCheckDigit("000000000000", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(0);
		expect(calculateCnpjCheckDigit("000000000006", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(0);
	});

	test("should return 9 when the weighted sum leaves a remainder of 2", () => {
		expect(calculateCnpjCheckDigit("000000000001", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(9);
	});

	test("should weigh each position by its own weight", () => {
		expect(calculateCnpjCheckDigit("100000000000", CNPJ_FIRST_DIGIT_WEIGHTS)).toBe(6);
		expect(calculateCnpjCheckDigit("1000000000000", CNPJ_SECOND_DIGIT_WEIGHTS)).toBe(5);
	});
});
