import { describe, expect, test } from "../test/runtime";
import { readBanks } from "./read-banks";

describe("readBanks", () => {
	test("should read the first bank, Banco do Brasil", () => {
		expect(readBanks()[0]).toEqual({
			code: "001",
			ispb: "00000000",
			name: "Banco do Brasil S.A.",
		});
	});

	test("should read the banks in ascending order of code, each with a name and an ISPB", () => {
		const banks = readBanks();

		expect(banks.every((bank, index) => index === 0 || banks[index - 1].code < bank.code)).toBe(
			true,
		);

		for (const bank of banks) {
			expect(bank.code).toMatch(/^\d{3}$/);
			expect(bank.ispb).toHaveLength(8);
			expect(bank.name.trim()).not.toBe("");
		}
	});

	test("should hand back the same array on a second read", () => {
		expect(readBanks()).toBe(readBanks());
	});
});
