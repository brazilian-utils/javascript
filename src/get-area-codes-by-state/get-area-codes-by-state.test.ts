import { describe, expect, test } from "../_internals/test/runtime";
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
			// @ts-expect-error
			expect(getAreaCodesByState(null)).toEqual([]);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(getAreaCodesByState(undefined)).toEqual([]);
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(getAreaCodesByState(11)).toEqual([]);
		});
	});
});
