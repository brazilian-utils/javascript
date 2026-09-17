import * as fc from "fast-check";

import { BANKS, type Bank, LEGACY_BANK_CODES } from "../_internals/constants/banks";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { type GetBanksParams, getBanks } from "./get-banks";

const CURRENT_BANKS = BANKS.filter((bank) => !LEGACY_BANK_CODES.includes(bank.code));

describe("getBanks", () => {
	it("should return every bank the participants list publishes today", () => {
		expect(getBanks()).toHaveLength(CURRENT_BANKS.length);
		expect(getBanks().every((bank) => !bank.legacy)).toBe(true);
	});

	it("should include Banco do Brasil", () => {
		expect(getBanks()).toContainEqual({
			code: "001",
			ispb: "00000000",
			name: "Banco do Brasil S.A.",
			legacy: false,
		});
	});

	it("should include Itaú Unibanco", () => {
		expect(getBanks()).toContainEqual({
			code: "341",
			ispb: "60701190",
			name: "ITAÚ UNIBANCO S.A.",
			legacy: false,
		});
	});

	it("should leave the codes the list no longer publishes out", () => {
		expect(getBanks().some((bank) => bank.code === "746")).toBe(false);
	});

	it("should add those codes with includeLegacy", () => {
		const banks = getBanks({ includeLegacy: true });

		expect(banks).toHaveLength(BANKS.length);
		expect(banks).toContainEqual({
			code: "746",
			ispb: "30723886",
			name: "Banco Modal S.A.",
			legacy: true,
		});
	});

	it("should leave them out for an explicit includeLegacy false", () => {
		expect(getBanks({ includeLegacy: false })).toHaveLength(CURRENT_BANKS.length);
	});

	it("should leave them out for an empty object", () => {
		expect(getBanks({})).toHaveLength(CURRENT_BANKS.length);
	});

	it("should keep the table order when the legacy codes are listed", () => {
		const codes = getBanks({ includeLegacy: true }).map((bank) => bank.code);

		expect(codes).toEqual([...codes].sort());
	});

	it("should return a fresh array on every call", () => {
		expect(getBanks()).not.toBe(getBanks());
	});

	it("should return fresh objects that do not affect subsequent calls when mutated", () => {
		const firstBank = getBanks().at(0);

		expect(firstBank).toBeDefined();

		if (firstBank === undefined) {
			return;
		}

		firstBank.name = "mutated";

		expect(getBanks().at(0)?.name).not.toBe("mutated");
	});

	describe("properties", () => {
		const indexes = fc.nat({ max: CURRENT_BANKS.length - 1 });
		const includeLegacyValues = fc.option(fc.boolean(), { nil: undefined });

		test("should describe every bank with a COMPE code, an ISPB and a name", () => {
			fc.assert(
				fc.property(indexes, (index) => {
					const bank = getBanks()[index];

					expect(/^\d{3}$/.test(bank.code)).toBe(true);
					expect(/^\d{8}$/.test(bank.ispb)).toBe(true);
					expect(bank.name.length).toBeGreaterThan(0);
					expect(bank.legacy).toBe(false);
				}),
			);
		});

		test("should list a row of the table, whatever includeLegacy is", () => {
			fc.assert(
				fc.property(includeLegacyValues, (includeLegacy) => {
					const banks = getBanks({ includeLegacy });

					expect(banks.length).toBe(includeLegacy === true ? BANKS.length : CURRENT_BANKS.length);
					expect(banks.every((bank) => BANKS.some((row) => row.code === bank.code))).toBe(true);
				}),
			);
		});

		test("should hand out a fresh copy on every call", () => {
			fc.assert(
				fc.property(indexes, (index) => {
					const bank = getBanks()[index];

					bank.name = "changed";

					expect(getBanks()[index].name).toBe(CURRENT_BANKS[index].name);
				}),
			);
		});
	});
});

describe("getBanks includeLegacy truthiness", () => {
	test("should read includeLegacy for truthiness, like pad", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getBanks({ includeLegacy: 1 }).length).toBe(getBanks({ includeLegacy: true }).length);
		// @ts-expect-error: intentionally invalid input
		expect(getBanks({ includeLegacy: 0 }).length).toBe(getBanks().length);
	});
});

describe("getBanks types", () => {
	test("should take optional listing options and return an array of banks", () => {
		expectTypeOf(getBanks).parameter(0).toEqualTypeOf<GetBanksParams | undefined>();
		expectTypeOf(getBanks).returns.toEqualTypeOf<Bank[]>();
	});

	test("should type includeLegacy as an optional boolean", () => {
		expectTypeOf<GetBanksParams["includeLegacy"]>().toEqualTypeOf<boolean | undefined>();
	});
});
