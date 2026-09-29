import { STATE_CODES } from "../_internals/constants/state-codes";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import {
	getMunicipalityByCode,
	type Municipality,
} from "../get-municipality-by-code/get-municipality-by-code";
import { getStateCapital } from "./get-state-capital";

describe("getStateCapital", () => {
	it("should return the capital of a state, per the IBGE Anuário table of the state capitals", () => {
		expect(getStateCapital("SP")).toEqual({ code: "3550308", name: "São Paulo", stateCode: "SP" });
		expect(getStateCapital("TO")).toEqual({ code: "1721000", name: "Palmas", stateCode: "TO" });
		expect(getStateCapital("RR")).toEqual({ code: "1400100", name: "Boa Vista", stateCode: "RR" });
	});

	it("should return Brasília for the Distrito Federal", () => {
		expect(getStateCapital("DF")).toEqual({ code: "5300108", name: "Brasília", stateCode: "DF" });
	});

	it("should match case-insensitively and ignore surrounding whitespace", () => {
		expect(getStateCapital(" mg ")).toEqual({
			code: "3106200",
			name: "Belo Horizonte",
			stateCode: "MG",
		});
	});

	it("should return a fresh object, so mutating it leaves a later call intact", () => {
		const capital = getStateCapital("PE");

		if (capital !== null) capital.name = "MUTATED";

		expect(getStateCapital("PE")?.name).toBe("Recife");
	});

	it("should return null for a code that is not a state", () => {
		expect(getStateCapital("ZZ")).toBeNull();
		expect(getStateCapital("")).toBeNull();
		expect(getStateCapital("__proto__")).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getStateCapital(35)).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStateCapital, anyGarbage);
		});

		test("should give every state a capital that getMunicipalityByCode finds in that state", () => {
			for (const stateCode of STATE_CODES) {
				const capital = getStateCapital(stateCode);

				expect(capital).not.toBeNull();
				expect(getMunicipalityByCode(capital?.code ?? "")).toEqual(capital);
			}
		});
	});
});

describe("getStateCapital types", () => {
	test("should take a string and return a Municipality or null", () => {
		expectTypeOf(getStateCapital).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getStateCapital).returns.toEqualTypeOf<Municipality | null>();
	});
});
