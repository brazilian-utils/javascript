import { describe, expect, test } from "../test/runtime";
import { mod10 } from "./mod10";

describe("mod10", () => {
	test("should calculate correct check digit for first partial", () => {
		expect(mod10("001900000")).toBe(9);
	});

	test("should calculate correct check digit for second partial", () => {
		expect(mod10("0114971860")).toBe(1);
	});

	test("should calculate correct check digit for third partial", () => {
		expect(mod10("6852452211")).toBe(4);
	});

	test("should return 0 when mod is 0", () => {
		expect(mod10("000000000")).toBe(0);
	});

	describe("with the gs1 variant", () => {
		test("should calculate the 18 digit example of the GS1 General Specifications, table 7-9", () => {
			expect(mod10("37610425002123456", { variant: "gs1" })).toBe(9);
		});

		test("should calculate the check digit of the GTIN examples of the GS1 General Specifications", () => {
			expect(mod10("952123450001", { variant: "gs1" })).toBe(8);
			expect(mod10("0952414123456", { variant: "gs1" })).toBe(4);
			expect(mod10("06141411234", { variant: "gs1" })).toBe(5);
		});

		test("should return 0 when the sum is a multiple of ten", () => {
			expect(mod10("0000000", { variant: "gs1" })).toBe(0);
			expect(mod10("1234567", { variant: "gs1" })).toBe(0);
		});

		test("should differ from the luhn variant for the same digits", () => {
			expect(mod10("952123450001")).toBe(1);
			expect(mod10("952123450001", { variant: "gs1" })).toBe(8);
		});
	});

	test("should apply the luhn variant when it is named", () => {
		expect(mod10("001900000", { variant: "luhn" })).toBe(9);
	});
});
