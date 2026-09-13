import * as fc from "fast-check";

import { stateCodes } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { getAreaCodeInfo } from "../get-area-code-info/get-area-code-info";
import { getAreaCodesByState } from "./get-area-codes-by-state";

describe("getAreaCodesByState", () => {
	test("should return the ascending list of DDDs for a state with several DDDs", () => {
		expect(getAreaCodesByState("SP")).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
	});

	test("should return a single element list for a state with one DDD", () => {
		expect(getAreaCodesByState("AC")).toEqual([68]);
	});

	test("should be case-insensitive", () => {
		expect(getAreaCodesByState("sp")).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
		expect(getAreaCodesByState("Sp")).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
	});

	test("should trim surrounding whitespace", () => {
		expect(getAreaCodesByState("  SP  ")).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
	});

	test("should return DDDs out of numeric order in the source table sorted ascending", () => {
		expect(getAreaCodesByState("PE")).toEqual([81, 87]);
	});

	test("should list DDD 61 for Goiás, which the Entorno do Distrito Federal shares with the DF", () => {
		expect(getAreaCodesByState("GO")).toContain(61);
		expect(getAreaCodesByState("GO")).toEqual([61, 62, 64]);
	});

	test("should list only DDD 61 for the Distrito Federal", () => {
		expect(getAreaCodesByState("DF")).toEqual([61]);
	});

	test("should list the border DDDs 42, 47 and 49 under both of their states", () => {
		expect(getAreaCodesByState("SC")).toEqual([42, 47, 48, 49]);
		expect(getAreaCodesByState("PR")).toEqual([41, 42, 43, 44, 45, 46, 47, 49]);
	});

	test("should return a fresh array on every call", () => {
		const first = getAreaCodesByState("AC");
		first.push(999);
		expect(getAreaCodesByState("AC")).toEqual([68]);
	});

	describe("should return an empty array", () => {
		test("when the state code does not match any Brazilian state", () => {
			expect(getAreaCodesByState("XX")).toEqual([]);
		});

		test("when it is an empty string", () => {
			expect(getAreaCodesByState("")).toEqual([]);
		});

		test("when it is a blank string", () => {
			expect(getAreaCodesByState("   ")).toEqual([]);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getAreaCodesByState(null)).toEqual([]);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getAreaCodesByState()).toEqual([]);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getAreaCodesByState(11)).toEqual([]);
		});
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getAreaCodesByState, fc.anything());
		});

		test("should return every DDD sorted ascending, each listing the state back", () => {
			fc.assert(
				fc.property(stateCodes, (stateCode) => {
					const areaCodes = getAreaCodesByState(stateCode);
					const sorted = [...areaCodes].sort((a, b) => a - b);

					expect(areaCodes).toEqual(sorted);

					for (const areaCode of areaCodes) {
						expect(getAreaCodeInfo(areaCode)?.stateCodes).toContain(stateCode);
					}
				}),
			);
		});

		test("should return the primary state of every DDD it does not share with another state", () => {
			fc.assert(
				fc.property(stateCodes, (stateCode) => {
					for (const areaCode of getAreaCodesByState(stateCode)) {
						const info = getAreaCodeInfo(areaCode);

						if (info?.stateCodes.length === 1) expect(info.stateCode).toBe(stateCode);
					}
				}),
			);
		});

		test("should be case-insensitive", () => {
			fc.assert(
				fc.property(stateCodes, (stateCode) => {
					expect(getAreaCodesByState(stateCode.toLowerCase())).toEqual(
						getAreaCodesByState(stateCode),
					);
				}),
			);
		});
	});
});

describe("getAreaCodesByState types", () => {
	test("should take a string and return an array of numbers", () => {
		expectTypeOf(getAreaCodesByState).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getAreaCodesByState).returns.toEqualTypeOf<number[]>();
	});
});
