import * as fc from "fast-check";

import { DATA } from "../_internals/constants/cities";
import { type StateCode } from "../_internals/constants/states";
import { anyGarbage, stateCodes } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStates } from "../get-states/get-states";
import { getCities } from "./get-cities";

const NUMBER_OF_BRAZILIAN_CITIES = 5571;

const NUMBER_OF_BRAZILIAN_STATES = 27;

const KNOWN_STATE_CITY_COUNTS: Record<string, number> = {
	MG: 853,
	RS: 497,
	SP: 645,
};

describe("getCities", () => {
	it("should match a hand-written list of city names at the start and end of the sorted list", () => {
		const cities = getCities();

		expect(cities.slice(0, 3)).toEqual(["Abadia de Goiás", "Abadia dos Dourados", "Abadiânia"]);
		expect(cities.slice(-3)).toEqual(["Zacarias", "Zé Doca", "Zortéa"]);
		expect(cities).toContain("São Paulo");
	});

	it("should return cities of all states", () => {
		expect(getCities().length).toEqual(NUMBER_OF_BRAZILIAN_CITIES);
	});

	it("should sort the combined list with the pt-BR comparator", () => {
		const cities = getCities();
		const sorted = [...cities].sort((a, b) => a.localeCompare(b, "pt-BR"));

		expect(cities).toEqual(sorted);
	});

	it("should return empty array if state does not exist", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getCities("ACC")).toEqual([]);
	});

	it("should return empty array for inherited Object property names instead of throwing", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getCities("toString")).toEqual([]);
		// @ts-expect-error: intentionally invalid input
		expect(getCities("constructor")).toEqual([]);
	});

	it("should return a fresh copy so mutating the result does not affect subsequent calls", () => {
		const all = getCities();
		all.push("MUTATED CITY");

		expect(getCities().length).toEqual(NUMBER_OF_BRAZILIAN_CITIES);

		const spCities = getCities("SP");
		spCities.push("MUTATED CITY");

		expect(getCities("SP").length).toEqual(KNOWN_STATE_CITY_COUNTS["SP"]);
	});

	describe("data integrity (IBGE 2022, https://cidades.ibge.gov.br/brasil/panorama)", () => {
		it(`should have exactly ${NUMBER_OF_BRAZILIAN_STATES} states with cities`, () => {
			expect(Object.keys(DATA).length).toBe(NUMBER_OF_BRAZILIAN_STATES);
		});

		it(`should total exactly ${NUMBER_OF_BRAZILIAN_CITIES} cities across all states`, () => {
			const total = Object.values(DATA).reduce((sum, cities) => sum + cities.length, 0);
			expect(total).toBe(NUMBER_OF_BRAZILIAN_CITIES);
		});

		for (const [stateCode, expectedCount] of Object.entries(KNOWN_STATE_CITY_COUNTS)) {
			it(`should have ${expectedCount} cities for ${stateCode}`, () => {
				expect(getCities(stateCode as never).length).toBe(expectedCount);
			});
		}
	});

	describe("return cities from states", () => {
		const states = getStates();

		for (const { code } of states) {
			it(`should return cities from code ${code}`, () => {
				const stateCityNames = DATA[code].map(([name]) => name);
				expect(getCities(code)).toEqual(stateCityNames);
			});
		}
	});

	it("should return a fresh copy of the cached combined list on every call", () => {
		const first = getCities();
		const second = getCities();

		expect(second).toEqual(first);
		expect(second).not.toBe(first);

		first.push("Cidade Inexistente");

		expect(getCities()).not.toContain("Cidade Inexistente");
		expect(getCities()).toHaveLength(first.length - 1);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCities, anyGarbage);
		});

		test("should return, for every state, only cities that are also in the combined list", () => {
			const allCities = new Set(getCities());

			fc.assert(
				fc.property(stateCodes, (stateCode) => {
					for (const city of getCities(stateCode)) {
						expect(allCities.has(city)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("getCities types", () => {
	test("should take an optional StateCode and return an array of strings", () => {
		expectTypeOf(getCities).parameter(0).toEqualTypeOf<StateCode | undefined>();
		expectTypeOf(getCities).returns.toEqualTypeOf<string[]>();
	});
});
