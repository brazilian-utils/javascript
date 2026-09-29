import { describe, expect, test } from "../test/runtime";
import { calculateMunicipalityCheckDigit } from "./calculate-municipality-check-digit";

describe("calculateMunicipalityCheckDigit", () => {
	test("should give the check digit of known municipality codes", () => {
		expect(calculateMunicipalityCheckDigit("355030")).toBe(8);
		expect(calculateMunicipalityCheckDigit("330455")).toBe(7);
		expect(calculateMunicipalityCheckDigit("530010")).toBe(8);
		expect(calculateMunicipalityCheckDigit("120001")).toBe(3);
	});

	test("should count a product above 9 as the sum of its digits", () => {
		expect(calculateMunicipalityCheckDigit("999999")).toBe(6);
	});

	test("should give 0 when the total is a multiple of 10", () => {
		expect(calculateMunicipalityCheckDigit("000000")).toBe(0);
	});
});
