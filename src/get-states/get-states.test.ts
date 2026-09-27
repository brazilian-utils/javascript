import * as fc from "fast-check";

import { DATA, type State, type StateCode, type StateName } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { getRegions } from "../get-regions/get-regions";
import { getStateByIbgeCode } from "../get-state-by-ibge-code/get-state-by-ibge-code";
import { getStateCodeByName } from "../get-state-code-by-name/get-state-code-by-name";
import { getStateNameByCode } from "../get-state-name-by-code/get-state-name-by-code";
import { getStates } from "./get-states";

const NUMBER_OF_BRAZILIAN_STATES = 27;

const stateArbitrary = (): fc.Arbitrary<State> => fc.constantFrom(...getStates());

describe("getStates", () => {
	it(`should return an array with ${DATA.length} states`, () => {
		expect(getStates().length).toBe(DATA.length);
	});

	it(`should return exactly ${NUMBER_OF_BRAZILIAN_STATES} states`, () => {
		expect(getStates().length).toBe(NUMBER_OF_BRAZILIAN_STATES);
	});

	it("should return an array sorted by name with the pt-BR comparator", () => {
		const names = getStates().map((state) => state.name);
		const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));

		expect(names).toEqual(sortedNames);
	});

	it("should sort Pará, Paraíba and Paraná the way a Brazilian reader expects", () => {
		const names = getStates().map((state) => state.name);

		const paraIndex = names.indexOf("Pará");
		const paraibaIndex = names.indexOf("Paraíba");
		const paranaIndex = names.indexOf("Paraná");

		expect(paraIndex).toBeLessThan(paraibaIndex);
		expect(paraibaIndex).toBeLessThan(paranaIndex);
	});

	it("should sort Rio de Janeiro, Rio Grande do Norte and Rio Grande do Sul the way a Brazilian reader expects", () => {
		const names = getStates().map((state) => state.name);

		const rioDeJaneiroIndex = names.indexOf("Rio de Janeiro");
		const rioGrandeDoNorteIndex = names.indexOf("Rio Grande do Norte");
		const rioGrandeDoSulIndex = names.indexOf("Rio Grande do Sul");

		expect(rioDeJaneiroIndex).toBeLessThan(rioGrandeDoNorteIndex);
		expect(rioGrandeDoNorteIndex).toBeLessThan(rioGrandeDoSulIndex);
	});

	it("should sort São Paulo before Sergipe", () => {
		const names = getStates().map((state) => state.name);

		expect(names.indexOf("São Paulo")).toBeLessThan(names.indexOf("Sergipe"));
	});

	it("should return unique deep copies so mutating the result does not leak between calls", () => {
		const firstState = getStates().at(0);

		expect(firstState).toBeDefined();

		if (firstState === undefined) {
			return;
		}

		Object.assign(firstState, { name: "X" });

		const second = getStates();

		expect(second.at(0)?.name).not.toBe("X");
		expect(second).toEqual(DATA.map((state) => Object.assign({}, state)));
	});

	it("should copy the capital too, so mutating it does not leak between calls", () => {
		const [first] = getStates();

		Object.assign(first?.capital ?? {}, { name: "X" });

		expect(getStates().at(0)?.capital).toEqual({ code: "1200401", name: "Rio Branco" });
		expect(DATA.at(0)?.capital.name).toBe("Rio Branco");
	});

	it("should give the Distrito Federal Brasília, the code of the whole district", () => {
		expect(getStates().find((state) => state.code === "DF")?.capital).toEqual({
			code: "5300108",
			name: "Brasília",
		});
	});

	describe("properties", () => {
		test("should have a code and name that are inverses of each other", () => {
			fc.assert(
				fc.property(stateArbitrary(), (state) => {
					expect(getStateCodeByName(state.name)).toBe(state.code);
					expect(getStateNameByCode(state.code)).toBe(state.name);
				}),
			);
		});

		test("should have an ibgeCode that resolves back to the same state", () => {
			fc.assert(
				fc.property(stateArbitrary(), (state) => {
					expect(getStateByIbgeCode(state.ibgeCode)).toEqual(state);
				}),
			);
		});

		test("should have a capital that getMunicipalityByCode finds in the same state", () => {
			fc.assert(
				fc.property(stateArbitrary(), (state) => {
					expect(getMunicipalityByCode(state.capital?.code ?? "")).toEqual({
						code: state.capital?.code,
						name: state.capital?.name,
						stateCode: state.code,
					});
				}),
			);
		});

		test("should have the regionIbgeCode of its region, the first digit of its ibgeCode", () => {
			fc.assert(
				fc.property(stateArbitrary(), (state) => {
					const region = getRegions().find((entry) => entry.code === state.regionCode);

					expect(state.regionIbgeCode).toBe(region?.ibgeCode);
					expect(state.regionIbgeCode).toBe(Math.floor(state.ibgeCode / 10));
				}),
			);
		});
	});
});

describe("getStates types", () => {
	test("should take no arguments and return an array of State", () => {
		expectTypeOf(getStates).parameters.toEqualTypeOf<[]>();
		expectTypeOf(getStates).returns.toEqualTypeOf<State[]>();
		expectTypeOf<State["code"]>().toEqualTypeOf<StateCode>();
		expectTypeOf<State["name"]>().toEqualTypeOf<StateName>();
		expectTypeOf<State["regionCode"]>().toEqualTypeOf<"N" | "NE" | "CO" | "SE" | "S">();
		expectTypeOf<State["regionName"]>().toEqualTypeOf<
			"Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul"
		>();
	});

	test("should tie every field of a state to its code, so narrowing by code narrows the rest", () => {
		expectTypeOf<Extract<State, { code: "SP" }>["name"]>().toEqualTypeOf<"São Paulo">();
		expectTypeOf<Extract<State, { code: "SP" }>["regionCode"]>().toEqualTypeOf<"SE">();
		expectTypeOf<Extract<State, { code: "SP" }>["regionName"]>().toEqualTypeOf<"Sudeste">();
		expectTypeOf<Extract<State, { code: "SP" }>["ibgeCode"]>().toEqualTypeOf<35>();
		expectTypeOf<Extract<State, { code: "SP" }>["regionIbgeCode"]>().toEqualTypeOf<3 | undefined>();
		expectTypeOf<Extract<State, { code: "SP" }>["capital"]>().toEqualTypeOf<
			{ readonly code: "3550308"; readonly name: "São Paulo" } | undefined
		>();
		expectTypeOf<Extract<State, { code: "AC" }>["name"]>().toEqualTypeOf<"Acre">();
		expectTypeOf<Extract<State, { code: "SP"; name: "Acre" }>>().toEqualTypeOf<never>();
	});
});
