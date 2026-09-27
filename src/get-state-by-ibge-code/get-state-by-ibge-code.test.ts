import * as fc from "fast-check";

import { DATA as STATES, type State } from "../_internals/constants/states";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStateByIbgeCode } from "./get-state-by-ibge-code";

describe("getStateByIbgeCode", () => {
	it("should return São Paulo for the string code 35, the cUF used in NF-e access keys (MOC 7)", () => {
		expect(getStateByIbgeCode("35")).toEqual({
			code: "SP",
			name: "São Paulo",
			regionCode: "SE",
			regionName: "Sudeste",
			ibgeCode: 35,
			regionIbgeCode: 3,
			capital: { code: "3550308", name: "São Paulo" },
		});
	});

	it("should return São Paulo for the number code 35", () => {
		expect(getStateByIbgeCode(35)).toEqual(getStateByIbgeCode("35"));
		expect(getStateByIbgeCode(35)?.code).toBe("SP");
	});

	it("should return Rondônia for the code 11, the first cUF in the IBGE table", () => {
		expect(getStateByIbgeCode("11")?.code).toBe("RO");
	});

	it("should return Distrito Federal for the code 53, the last cUF in the IBGE table", () => {
		expect(getStateByIbgeCode("53")?.code).toBe("DF");
	});

	it("should return a fresh copy that does not mutate the underlying constant", () => {
		const state = getStateByIbgeCode("35");
		if (state) Object.assign(state, { name: "X" });

		expect(getStateByIbgeCode("35")?.name).toBe("São Paulo");
	});

	it("should strip a leading zero before matching", () => {
		expect(getStateByIbgeCode("035")?.code).toBe("SP");
	});

	it("should return null for a code with no matching state", () => {
		expect(getStateByIbgeCode("00")).toBeNull();
		expect(getStateByIbgeCode("99")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getStateByIbgeCode("")).toBeNull();
	});

	it("should return null for a negative number, not read it as the cUF 35", () => {
		expect(getStateByIbgeCode(-35)).toBeNull();
	});

	it("should return null for a fractional number, not read it as the cUF 35", () => {
		expect(getStateByIbgeCode(3.5)).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getStateByIbgeCode("   ")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateByIbgeCode(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateByIbgeCode()).toBeNull();
	});

	it("should ignore whitespace and hyphens around the code", () => {
		expect(getStateByIbgeCode(" 35 ")?.code).toBe("SP");
		expect(getStateByIbgeCode("-35-")?.code).toBe("SP");
	});

	it("should return null for a code with any other character, not strip it", () => {
		expect(getStateByIbgeCode("x11")).toBeNull();
		expect(getStateByIbgeCode("R$ 35")).toBeNull();
		expect(getStateByIbgeCode("3.5")).toBeNull();
		expect(getStateByIbgeCode("35/")).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStateByIbgeCode, anyGarbage);
		});

		test("should resolve every known ibgeCode regardless of surrounding whitespace and hyphens", () => {
			const knownIbgeCodeArbitrary = fc.constantFrom(...STATES.map((state) => state.ibgeCode));
			const noiseArbitrary = fc
				.array(fc.constantFrom(" ", "-", "\t"))
				.map((characters) => characters.join(""));

			fc.assert(
				fc.property(
					knownIbgeCodeArbitrary,
					noiseArbitrary,
					noiseArbitrary,
					(ibgeCode, prefix, suffix) => {
						expect(getStateByIbgeCode(`${prefix}${ibgeCode}${suffix}`)?.ibgeCode).toBe(ibgeCode);
					},
				),
			);
		});

		test("should return null for every known ibgeCode next to a letter", () => {
			const knownIbgeCodeArbitrary = fc.constantFrom(...STATES.map((state) => state.ibgeCode));
			const letterArbitrary = fc.constantFrom("a", "Z", "e", "x");

			fc.assert(
				fc.property(knownIbgeCodeArbitrary, letterArbitrary, (ibgeCode, letter) => {
					expect(getStateByIbgeCode(`${letter}${ibgeCode}`)).toBeNull();
					expect(getStateByIbgeCode(`${ibgeCode}${letter}`)).toBeNull();
				}),
			);
		});
	});
});

describe("getStateByIbgeCode types", () => {
	test("should take a string or number and return a State or null", () => {
		expectTypeOf(getStateByIbgeCode).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getStateByIbgeCode).returns.toEqualTypeOf<State | null>();
	});
});
