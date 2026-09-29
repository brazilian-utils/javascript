import { describe, expect, test } from "../test/runtime";
import { calculateProcessoJuridicoCheckDigits } from "./calculate-processo-juridico-check-digits";

describe("calculateProcessoJuridicoCheckDigits", () => {
	test("should return 29 for 0000001-29.2022.0.10.0001", () => {
		expect(calculateProcessoJuridicoCheckDigits("000000120220100001")).toBe(29);
	});

	test("should return 98 when the number is a multiple of 97", () => {
		expect(calculateProcessoJuridicoCheckDigits("000000000000000000")).toBe(98);
	});

	test("should return 2, the lowest value, when the product by 100 leaves the highest remainder, 96", () => {
		// 32 · 100 = 3200 = 32 · 97 + 96
		expect(calculateProcessoJuridicoCheckDigits("000000000000000032")).toBe(2);
	});

	test("should also check the Anexo II example of Resolução CNJ nº 477/2022 in the J.TR form", () => {
		// 0000100-DD.2008.4.06.0000: the Anexo prints DD 15, a fictitious value; the check gives 68
		expect(calculateProcessoJuridicoCheckDigits("000010020084060000")).toBe(68);
	});

	test("should return 95 for the number 1, whose product by 100 leaves a remainder of 3", () => {
		expect(calculateProcessoJuridicoCheckDigits("000000000000000001")).toBe(95);
	});

	test("should carry the remainder of the first 11 digits into the last 7", () => {
		expect(calculateProcessoJuridicoCheckDigits("999999999999999999")).toBe(28);
		expect(calculateProcessoJuridicoCheckDigits("123456720138260001")).toBe(5);
	});

	test("should agree with the BigInt form of the check for the number 100000000000000000", () => {
		const base = "100000000000000000";

		expect(calculateProcessoJuridicoCheckDigits(base)).toBe(
			Number(98n - ((BigInt(base) * 100n) % 97n)),
		);
	});
});
