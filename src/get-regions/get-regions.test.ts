import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStates } from "../get-states/get-states";
import { getRegions, type Region } from "./get-regions";

const EXPECTED_REGIONS = [
	{ code: "N", name: "Norte", ibgeCode: 1 },
	{ code: "NE", name: "Nordeste", ibgeCode: 2 },
	{ code: "SE", name: "Sudeste", ibgeCode: 3 },
	{ code: "S", name: "Sul", ibgeCode: 4 },
	{ code: "CO", name: "Centro-Oeste", ibgeCode: 5 },
];

describe("getRegions", () => {
	it("should return the five regions in the order of their IBGE identifier", () => {
		expect(getRegions()).toEqual(EXPECTED_REGIONS);
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

describe("getRegions properties", () => {
	describe("properties", () => {
		const regionIndexes = fc.integer({ min: 0, max: 4 });

		test("should return five regions with unique codes, every one carried by a state", () => {
			const regions = getRegions();
			const codes = regions.map((region) => region.code);

			expect(regions).toHaveLength(5);
			expect(new Set(codes).size).toBe(5);
			expect(new Set(getStates().map((state) => state.regionCode))).toEqual(new Set(codes));
		});

		test("should return fresh objects whatever is done to a previous result", () => {
			fc.assert(
				fc.property(regionIndexes, fc.string(), (index, name) => {
					const first = getRegions();

					Object.assign(first[index] ?? {}, { name });
					first.length = 0;

					expect(getRegions()).toEqual(EXPECTED_REGIONS);
				}),
			);
		});
	});
});

describe("getRegions types", () => {
	test("should return Region[]", () => {
		expectTypeOf(getRegions).returns.toEqualTypeOf<Region[]>();
	});
});
