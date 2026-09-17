import * as fc from "fast-check";

import { BANKS, type Bank } from "../_internals/constants/banks";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getBanks } from "./get-banks";

describe("getBanks", () => {
	it("should return every bank", () => {
		expect(getBanks()).toHaveLength(BANKS.length);
	});

	it("should include Banco do Brasil", () => {
		expect(getBanks()).toContainEqual({
			code: "001",
			ispb: "00000000",
			name: "Banco do Brasil S.A.",
		});
	});

	it("should include Itaú Unibanco", () => {
		expect(getBanks()).toContainEqual({
			code: "341",
			ispb: "60701190",
			name: "ITAÚ UNIBANCO S.A.",
		});
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
		const indexes = fc.nat({ max: BANKS.length - 1 });

		test("should describe every bank with a COMPE code, an ISPB and a name", () => {
			fc.assert(
				fc.property(indexes, (index) => {
					const bank = getBanks()[index];

					expect(/^\d{3}$/.test(bank.code)).toBe(true);
					expect(/^\d{8}$/.test(bank.ispb)).toBe(true);
					expect(bank.name.length).toBeGreaterThan(0);
				}),
			);
		});

		test("should hand out a fresh copy on every call", () => {
			fc.assert(
				fc.property(indexes, (index) => {
					const bank = getBanks()[index];

					bank.name = "changed";

					expect(getBanks()[index].name).toBe(BANKS[index].name);
				}),
			);
		});
	});
});

describe("getBanks types", () => {
	test("should take no parameters and return an array of banks", () => {
		expectTypeOf(getBanks).parameters.toEqualTypeOf<[]>();
		expectTypeOf(getBanks).returns.toEqualTypeOf<Bank[]>();
	});
});
