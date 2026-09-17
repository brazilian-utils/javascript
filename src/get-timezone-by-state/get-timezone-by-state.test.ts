import * as fc from "fast-check";

import { stateCodes } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getTimezoneByState } from "./get-timezone-by-state";

describe("getTimezoneByState", () => {
	it("should return America/Sao_Paulo for SP", () => {
		expect(getTimezoneByState("SP")).toBe("America/Sao_Paulo");
	});

	it("should return America/Manaus for AM, the tzdata BR row for Amazonas (east)", () => {
		expect(getTimezoneByState("AM")).toBe("America/Manaus");
	});

	it("should return America/Rio_Branco for AC", () => {
		expect(getTimezoneByState("AC")).toBe("America/Rio_Branco");
	});

	it("should return America/Recife for PE, not America/Noronha (Fernando de Noronha is a district of PE, not a state)", () => {
		expect(getTimezoneByState("PE")).toBe("America/Recife");
	});

	it("should return America/Belem for AP, per the tzdata BR row 'Pará (east), Amapá'", () => {
		expect(getTimezoneByState("AP")).toBe("America/Belem");
	});

	it("should return America/Belem for PA", () => {
		expect(getTimezoneByState("PA")).toBe("America/Belem");
	});

	it("should return America/Fortaleza for CE, MA, PI, RN and PB, the tzdata BR row 'Brazil (northeast: MA, PI, CE, RN, PB)'", () => {
		expect(getTimezoneByState("CE")).toBe("America/Fortaleza");
		expect(getTimezoneByState("MA")).toBe("America/Fortaleza");
		expect(getTimezoneByState("PI")).toBe("America/Fortaleza");
		expect(getTimezoneByState("RN")).toBe("America/Fortaleza");
		expect(getTimezoneByState("PB")).toBe("America/Fortaleza");
	});

	it("should return America/Sao_Paulo for every southeast/south/center-west state sharing that zone", () => {
		expect(getTimezoneByState("DF")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("GO")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("MG")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("ES")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("RJ")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("PR")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("SC")).toBe("America/Sao_Paulo");
		expect(getTimezoneByState("RS")).toBe("America/Sao_Paulo");
	});

	it("should return America/Maceio for AL and SE", () => {
		expect(getTimezoneByState("AL")).toBe("America/Maceio");
		expect(getTimezoneByState("SE")).toBe("America/Maceio");
	});

	it("should return America/Bahia for BA", () => {
		expect(getTimezoneByState("BA")).toBe("America/Bahia");
	});

	it("should return America/Cuiaba for MT", () => {
		expect(getTimezoneByState("MT")).toBe("America/Cuiaba");
	});

	it("should return America/Campo_Grande for MS", () => {
		expect(getTimezoneByState("MS")).toBe("America/Campo_Grande");
	});

	it("should return America/Porto_Velho for RO", () => {
		expect(getTimezoneByState("RO")).toBe("America/Porto_Velho");
	});

	it("should return America/Boa_Vista for RR", () => {
		expect(getTimezoneByState("RR")).toBe("America/Boa_Vista");
	});

	it("should return America/Araguaina for TO", () => {
		expect(getTimezoneByState("TO")).toBe("America/Araguaina");
	});

	it("should be case-insensitive", () => {
		expect(getTimezoneByState("sp")).toBe("America/Sao_Paulo");
	});

	it("should trim leading and trailing whitespace", () => {
		expect(getTimezoneByState("  SP  ")).toBe("America/Sao_Paulo");
	});

	it("should return null for a code that matches no state", () => {
		expect(getTimezoneByState("ZZ")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getTimezoneByState("")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getTimezoneByState(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getTimezoneByState()).toBeNull();
	});

	it("should return null for a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getTimezoneByState(35)).toBeNull();
	});

	it("should return null for names inherited from Object.prototype", () => {
		expect(getTimezoneByState("constructor")).toBeNull();
		expect(getTimezoneByState("toString")).toBeNull();
		expect(getTimezoneByState("__proto__")).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getTimezoneByState, fc.anything());
		});

		test("should resolve every known state code regardless of case or padding", () => {
			fc.assert(
				fc.property(stateCodes, fc.boolean(), fc.boolean(), (stateCode, upper, pad) => {
					const cased = upper ? stateCode.toUpperCase() : stateCode.toLowerCase();
					const padded = pad ? `  ${cased}  ` : cased;

					expect(getTimezoneByState(padded)).toBe(getTimezoneByState(stateCode));
					expect(getTimezoneByState(padded)).not.toBeNull();
				}),
			);
		});
	});
});

describe("getTimezoneByState types", () => {
	test("should take a string and return a string or null", () => {
		expectTypeOf(getTimezoneByState).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getTimezoneByState).returns.toEqualTypeOf<string | null>();
	});
});
