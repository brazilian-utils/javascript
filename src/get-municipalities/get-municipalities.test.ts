import * as fc from "fast-check";

import { DATA, type Municipality } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getCities } from "../get-cities/get-cities";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { getStates } from "../get-states/get-states";
import { getMunicipalities } from "./get-municipalities";

const NUMBER_OF_BRAZILIAN_MUNICIPALITIES = 5571;

const KNOWN_STATE_MUNICIPALITY_COUNTS: Partial<Record<StateCode, number>> = {
	MG: 853,
	MT: 142,
	RS: 497,
	SP: 645,
};

describe("getMunicipalities", () => {
	it("should return every municipality when no state is given", () => {
		expect(getMunicipalities().length).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);
	});

	it("should sort the combined list with the pt-BR comparator", () => {
		const municipalities = getMunicipalities();
		const names = municipalities.map((municipality) => municipality.name);
		const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));

		expect(names).toEqual(sortedNames);
	});

	it("should return municipality objects shaped as { code, name, stateCode }", () => {
		const saoPaulo = getMunicipalities("SP").find(
			(municipality) => municipality.name === "São Paulo",
		);

		expect(saoPaulo).toEqual({ code: "3550308", name: "São Paulo", stateCode: "SP" });
	});

	it("should filter municipalities by state", () => {
		for (const [stateCode, expectedCount] of Object.entries(KNOWN_STATE_MUNICIPALITY_COUNTS)) {
			expect(getMunicipalities(stateCode as StateCode).length).toBe(expectedCount);
		}
	});

	it("should include Boa Esperança do Norte/MT", () => {
		const municipalities = getMunicipalities("MT");

		expect(municipalities).toContainEqual({
			code: "5101837",
			name: "Boa Esperança do Norte",
			stateCode: "MT",
		});
	});

	it("should return an empty array for an unknown state", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalities("ZZ")).toEqual([]);
	});

	it("should return an empty array for inherited Object property names instead of throwing", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalities("toString")).toEqual([]);
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalities("constructor")).toEqual([]);
	});

	it("should return a fresh copy so mutating the result does not affect subsequent calls", () => {
		const all = getMunicipalities();
		all.push({ code: "0000000", name: "MUTATED", stateCode: "SP" });

		expect(getMunicipalities().length).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);

		const firstSpMunicipality = getMunicipalities("SP").at(0);

		expect(firstSpMunicipality).toBeDefined();

		if (firstSpMunicipality === undefined) {
			return;
		}

		firstSpMunicipality.name = "MUTATED";

		expect(getMunicipalities("SP").at(0)?.name).not.toBe("MUTATED");
	});

	describe("data integrity (IBGE, https://servicodados.ibge.gov.br/api/docs/localidades)", () => {
		it(`should total exactly ${NUMBER_OF_BRAZILIAN_MUNICIPALITIES} municipalities across all states`, () => {
			const total = Object.values(DATA).reduce(
				(sum, municipalities) => sum + municipalities.length,
				0,
			);

			expect(total).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);
		});

		for (const { code } of getStates()) {
			it(`should return municipalities matching DATA for state ${code}`, () => {
				const expected = DATA[code].map(([name, municipalityCode]) => ({
					code: municipalityCode,
					name,
					stateCode: code,
				}));

				expect(getMunicipalities(code)).toEqual(expected);
			});
		}
	});

	describe("properties", () => {
		const stateCodeArbitrary = fc.constantFrom(...getStates().map((state) => state.code));

		test("should never throw, regardless of the input", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(() => getMunicipalities(value as never)).not.toThrow();
				}),
			);
		});

		test("should list, for every state, the same names and order as getCities", () => {
			fc.assert(
				fc.property(stateCodeArbitrary, (stateCode) => {
					const names = getMunicipalities(stateCode).map((municipality) => municipality.name);

					expect(names).toEqual(getCities(stateCode));
				}),
			);
		});

		test("should have every municipality resolve back to itself through getMunicipalityByCode", () => {
			const municipalityArbitrary = fc.constantFrom(...getMunicipalities());

			fc.assert(
				fc.property(municipalityArbitrary, (municipality) => {
					expect(getMunicipalityByCode(municipality.code)).toEqual(municipality);
				}),
			);
		});
	});
});

describe("getMunicipalities types", () => {
	test("should take an optional string and return an array of Municipality", () => {
		expectTypeOf(getMunicipalities).parameter(0).toEqualTypeOf<StateCode | undefined>();
		expectTypeOf(getMunicipalities).returns.toEqualTypeOf<Municipality[]>();
		expectTypeOf<Municipality>().toEqualTypeOf<{
			code: string;
			name: string;
			stateCode: StateCode;
		}>();
	});
});
