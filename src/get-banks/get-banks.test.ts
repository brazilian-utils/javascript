import { BANKS } from "../_internals/constants/banks";
import { describe, expect, it } from "../_internals/test/runtime";
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
});
