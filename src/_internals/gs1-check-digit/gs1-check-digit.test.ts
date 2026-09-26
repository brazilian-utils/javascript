import { describe, expect, test } from "../test/runtime";
import { gs1CheckDigit } from "./gs1-check-digit";

describe("gs1CheckDigit", () => {
	test("should calculate the 18 digit example of the GS1 General Specifications, table 7-9", () => {
		expect(gs1CheckDigit("37610425002123456")).toBe(9);
	});

	test("should calculate the check digit of the GTIN examples of the GS1 General Specifications", () => {
		expect(gs1CheckDigit("952123450001")).toBe(8);
		expect(gs1CheckDigit("0952414123456")).toBe(4);
		expect(gs1CheckDigit("06141411234")).toBe(5);
	});

	test("should return 0 when the sum is a multiple of ten", () => {
		expect(gs1CheckDigit("0000000")).toBe(0);
		expect(gs1CheckDigit("1234567")).toBe(0);
	});
});
