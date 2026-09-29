import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStates } from "../get-states/get-states";
import { getRegions, type Region } from "./get-regions";

describe("getRegions", () => {
	it("should return the five regions in the order of their IBGE identifier", () => {
		expect(getRegions()).toEqual([
			{ code: "N", name: "Norte", ibgeCode: 1 },
			{ code: "NE", name: "Nordeste", ibgeCode: 2 },
			{ code: "SE", name: "Sudeste", ibgeCode: 3 },
			{ code: "S", name: "Sul", ibgeCode: 4 },
			{ code: "CO", name: "Centro-Oeste", ibgeCode: 5 },
		]);
	});

	it("should match the region code and name every state carries", () => {
		const regions = getRegions();

		for (const state of getStates()) {
			expect(regions.find((region) => region.code === state.regionCode)?.name).toBe(
				state.regionName,
			);
		}
	});

	it("should give each region the first digit of the IBGE code of its states", () => {
		const regions = getRegions();

		for (const state of getStates()) {
			expect(regions.find((region) => region.code === state.regionCode)?.ibgeCode).toBe(
				Math.floor(state.ibgeCode / 10),
			);
		}
	});

	it("should return fresh objects, so mutating one leaves a later call intact", () => {
		const [first] = getRegions();

		if (first !== undefined) Object.assign(first, { name: "MUTATED" });

		expect(getRegions()[0]?.name).toBe("Norte");
	});
});

describe("getRegions types", () => {
	test("should return Region[]", () => {
		expectTypeOf(getRegions).returns.toEqualTypeOf<Region[]>();
	});
});
