import { readBanks } from "../read-banks/read-banks";
import { describe, expect, test } from "../test/runtime";
import { findBank } from "./find-bank";

describe("findBank", () => {
	test("should find every bank of the table by its code and by its ISPB", () => {
		for (const bank of readBanks()) {
			expect(findBank("code", bank.code)).toBe(
				readBanks().find((entry) => entry.code === bank.code),
			);
			expect(findBank("ispb", bank.ispb)).toBe(
				readBanks().find((entry) => entry.ispb === bank.ispb),
			);
		}
	});

	test("should return undefined for a value no bank has", () => {
		expect(findBank("code", "000")).toBeUndefined();
		expect(findBank("ispb", "abc")).toBeUndefined();
	});

	test("should not match a prototype chain key", () => {
		expect(findBank("code", "constructor")).toBeUndefined();
		expect(findBank("ispb", "__proto__")).toBeUndefined();
	});
});
