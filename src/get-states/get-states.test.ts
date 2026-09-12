import * as fc from "fast-check";

import { DATA, type State, type StateCode, type StateName } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
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
	});
});

describe("getStates types", () => {
	test("should take no arguments and return an array of State", () => {
		expectTypeOf(getStates).parameter(0).toBeUndefined();
		expectTypeOf(getStates).returns.toEqualTypeOf<State[]>();
		expectTypeOf<State>().toEqualTypeOf<{
			readonly code: StateCode;
			readonly name: StateName;
			readonly regionCode: "N" | "NE" | "CO" | "SE" | "S";
			readonly regionName: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
			readonly ibgeCode: number;
		}>();
	});
});
