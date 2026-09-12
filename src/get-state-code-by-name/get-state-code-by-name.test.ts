import * as fc from "fast-check";

import { DATA as STATES, type StateCode } from "../_internals/constants/states";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStateCodeByName } from "./get-state-code-by-name";

describe("getStateCodeByName", () => {
	it("should return SP for the exact published name", () => {
		expect(getStateCodeByName("São Paulo")).toBe("SP");
	});

	it("should be accent-insensitive", () => {
		expect(getStateCodeByName("Sao Paulo")).toBe("SP");
	});

	it("should be case-insensitive", () => {
		expect(getStateCodeByName("sao paulo")).toBe("SP");
		expect(getStateCodeByName("SAO PAULO")).toBe("SP");
	});

	it("should trim leading and trailing whitespace", () => {
		expect(getStateCodeByName("  São Paulo  ")).toBe("SP");
	});

	it("should combine accent removal, casing and trimming together", () => {
		expect(getStateCodeByName("  sao PAULO  ")).toBe("SP");
	});

	it("should resolve a multi-word name with accents, the Ceará example", () => {
		expect(getStateCodeByName("ceara")).toBe("CE");
	});

	it("should resolve a name containing 'do'/'de' particles, the Rio Grande do Sul example", () => {
		expect(getStateCodeByName("rio grande do sul")).toBe("RS");
	});

	it("should distinguish Rio Grande do Norte from Rio Grande do Sul", () => {
		expect(getStateCodeByName("Rio Grande do Norte")).toBe("RN");
		expect(getStateCodeByName("Rio Grande do Sul")).toBe("RS");
	});

	it("should return null for a name that matches no state", () => {
		expect(getStateCodeByName("Neverland")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getStateCodeByName("")).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getStateCodeByName("   ")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateCodeByName(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateCodeByName()).toBeNull();
	});

	it("should return null for a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateCodeByName(35)).toBeNull();
	});

	describe("properties", () => {
		const stateArbitrary = fc.constantFrom(...STATES);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStateCodeByName, fc.anything());
		});

		test("should resolve every known state name regardless of case, accents or padding", () => {
			fc.assert(
				fc.property(stateArbitrary, fc.boolean(), fc.boolean(), (state, upper, pad) => {
					const cased = upper ? state.name.toUpperCase() : state.name.toLowerCase();
					const padded = pad ? `  ${cased}  ` : cased;

					expect(getStateCodeByName(padded)).toBe(state.code);
				}),
			);
		});
	});
});

describe("getStateCodeByName types", () => {
	test("should take a string and return a StateCode or null", () => {
		expectTypeOf(getStateCodeByName).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getStateCodeByName).returns.toEqualTypeOf<StateCode | null>();
	});
});
