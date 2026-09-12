import * as fc from "fast-check";

import { DATA as STATES, type StateName } from "../_internals/constants/states";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStateNameByCode } from "./get-state-name-by-code";

describe("getStateNameByCode", () => {
	it("should return the full name for an uppercase code", () => {
		expect(getStateNameByCode("SP")).toBe("São Paulo");
	});

	it("should be case-insensitive", () => {
		expect(getStateNameByCode("sp")).toBe("São Paulo");
		expect(getStateNameByCode("Sp")).toBe("São Paulo");
	});

	it("should trim leading and trailing whitespace", () => {
		expect(getStateNameByCode("  RJ  ")).toBe("Rio de Janeiro");
	});

	it("should combine casing and trimming together", () => {
		expect(getStateNameByCode("  rj  ")).toBe("Rio de Janeiro");
	});

	it("should resolve the Distrito Federal code", () => {
		expect(getStateNameByCode("DF")).toBe("Distrito Federal");
	});

	it("should return null for a code that matches no state", () => {
		expect(getStateNameByCode("ZZ")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getStateNameByCode("")).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getStateNameByCode("   ")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode()).toBeNull();
	});

	it("should return null for a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode(11)).toBeNull();
	});

	describe("properties", () => {
		const stateArbitrary = fc.constantFrom(...STATES);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStateNameByCode, fc.anything());
		});

		test("should resolve every known state code regardless of case or padding", () => {
			fc.assert(
				fc.property(stateArbitrary, fc.boolean(), fc.boolean(), (state, upper, pad) => {
					const cased = upper ? state.code.toUpperCase() : state.code.toLowerCase();
					const padded = pad ? `  ${cased}  ` : cased;

					expect(getStateNameByCode(padded)).toBe(state.name);
				}),
			);
		});
	});
});

describe("getStateNameByCode types", () => {
	test("should take a string and return a StateName or null", () => {
		expectTypeOf(getStateNameByCode).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getStateNameByCode).returns.toEqualTypeOf<StateName | null>();
	});
});
