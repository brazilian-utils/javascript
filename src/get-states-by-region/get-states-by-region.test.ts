import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStates } from "../get-states/get-states";
import { getStatesByRegion, type State } from "./get-states-by-region";

const codes = (states: State[]): string[] => states.map((state) => state.code);

describe("getStatesByRegion", () => {
	it("should list the states of each region, per the IBGE API de Localidades, sorted by name", () => {
		expect(codes(getStatesByRegion("N"))).toEqual(["AC", "AP", "AM", "PA", "RO", "RR", "TO"]);
		expect(codes(getStatesByRegion("NE"))).toEqual([
			"AL",
			"BA",
			"CE",
			"MA",
			"PB",
			"PE",
			"PI",
			"RN",
			"SE",
		]);
		expect(codes(getStatesByRegion("SE"))).toEqual(["ES", "MG", "RJ", "SP"]);
		expect(codes(getStatesByRegion("S"))).toEqual(["PR", "RS", "SC"]);
		expect(codes(getStatesByRegion("CO"))).toEqual(["DF", "GO", "MT", "MS"]);
	});

	it("should match case-insensitively and ignore surrounding whitespace", () => {
		expect(codes(getStatesByRegion(" co "))).toEqual(["DF", "GO", "MT", "MS"]);
	});

	it("should cover all 27 states across the five regions", () => {
		const all = ["N", "NE", "SE", "S", "CO"].flatMap((region) => codes(getStatesByRegion(region)));

		expect(all.toSorted()).toEqual(codes(getStates()).toSorted());
	});

	it("should return fresh objects, so mutating one leaves a later call intact", () => {
		const [first] = getStatesByRegion("S");

		if (first !== undefined) Object.assign(first, { name: "MUTATED" });

		expect(getStatesByRegion("S")[0]?.name).toBe("Paraná");
	});

	it("should return an empty array for a code that is not a region", () => {
		expect(getStatesByRegion("X")).toEqual([]);
		expect(getStatesByRegion("")).toEqual([]);
		expect(getStatesByRegion("Norte")).toEqual([]);
		// @ts-expect-error: intentionally invalid input
		expect(getStatesByRegion(1)).toEqual([]);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStatesByRegion, anyGarbage);
		});
	});
});

describe("getStatesByRegion types", () => {
	test("should take a string and return State[]", () => {
		expectTypeOf(getStatesByRegion).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getStatesByRegion).returns.toEqualTypeOf<State[]>();
	});
});
