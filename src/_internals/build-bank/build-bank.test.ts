import * as fc from "fast-check";

import { BANKS, LEGACY_BANK_CODES } from "../constants/banks";
import { describe, expect, expectTypeOf, it, test } from "../test/runtime";
import { buildBank } from "./build-bank";

describe("buildBank", () => {
	it("should mark a code the participants list publishes today as current", () => {
		expect(buildBank({ code: "001", ispb: "00000000", name: "Banco do Brasil S.A." })).toEqual({
			code: "001",
			ispb: "00000000",
			name: "Banco do Brasil S.A.",
			legacy: false,
		});
	});

	it("should mark a code the participants list no longer publishes as legacy", () => {
		expect(buildBank({ code: "746", ispb: "30723886", name: "Banco Modal S.A." })).toEqual({
			code: "746",
			ispb: "30723886",
			name: "Banco Modal S.A.",
			legacy: true,
		});
	});

	it("should return a fresh object that does not alias the row", () => {
		const row = { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." };

		expect(buildBank(row)).not.toBe(row);
	});

	describe("properties", () => {
		test("should flag exactly the codes of LEGACY_BANK_CODES", () => {
			fc.assert(
				fc.property(fc.constantFrom(...BANKS), (bank) => {
					expect(buildBank(bank).legacy).toBe(LEGACY_BANK_CODES.includes(bank.code));
				}),
			);
		});
	});
});

describe("buildBank types", () => {
	test("should take a table row and return a bank", () => {
		expectTypeOf(buildBank).parameter(0).toEqualTypeOf<{
			code: string;
			ispb: string;
			name: string;
		}>();
	});
});
