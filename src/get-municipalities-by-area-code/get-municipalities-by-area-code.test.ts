import * as fc from "fast-check";

import { VALID_AREA_CODES } from "../_internals/constants/area-codes";
import { type Municipality } from "../_internals/constants/municipalities";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getAreaCodeByMunicipalityCode } from "../get-area-code-by-municipality-code/get-area-code-by-municipality-code";
import { getMunicipalities } from "../get-municipalities/get-municipalities";
import { getMunicipalitiesByAreaCode } from "./get-municipalities-by-area-code";

describe("getMunicipalitiesByAreaCode", () => {
	it("should list every municipality of Acre for 68", () => {
		expect(getMunicipalitiesByAreaCode(68)).toEqual(getMunicipalities("AC"));
	});

	it("should list the 64 municipalities of DDD 11, per the Anatel Códigos Nacionais table", () => {
		const municipalities = getMunicipalitiesByAreaCode("11");

		expect(municipalities).toHaveLength(64);
		expect(municipalities).toContainEqual({ code: "3550308", name: "São Paulo", stateCode: "SP" });
		expect(municipalities).toContainEqual({ code: "3518800", name: "Guarulhos", stateCode: "SP" });
		expect(municipalities).not.toContainEqual({
			code: "3509502",
			name: "Campinas",
			stateCode: "SP",
		});
	});

	it("should sort each state's municipalities by name, the way getMunicipalities does", () => {
		const names = getMunicipalitiesByAreaCode(11).map(({ name }) => name);

		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
	});

	it("should list Brasília first for 61, then the 12 Goiás municipalities around it", () => {
		const municipalities = getMunicipalitiesByAreaCode("(61)");

		expect(municipalities).toHaveLength(13);
		expect(municipalities[0]).toEqual({ code: "5300108", name: "Brasília", stateCode: "DF" });
		expect(municipalities.slice(1).every(({ stateCode }) => stateCode === "GO")).toBe(true);
	});

	it("should list the one municipality across a state line after the seat state's", () => {
		expect(getMunicipalitiesByAreaCode(42).at(-1)).toEqual({
			code: "4213609",
			name: "Porto União",
			stateCode: "SC",
		});
		expect(getMunicipalitiesByAreaCode(47).at(-1)).toEqual({
			code: "4122305",
			name: "Rio Negro",
			stateCode: "PR",
		});
		expect(getMunicipalitiesByAreaCode(49).at(-1)).toEqual({
			code: "4102604",
			name: "Barracão",
			stateCode: "PR",
		});
	});

	it("should return fresh objects, so mutating one leaves a later call intact", () => {
		const [first] = getMunicipalitiesByAreaCode(68);

		if (first !== undefined) first.name = "MUTATED";

		expect(getMunicipalitiesByAreaCode(68)[0]?.name).toBe("Acrelândia");
	});

	it("should return an empty array for a DDD that is not in use, or for input that is not a DDD", () => {
		expect(getMunicipalitiesByAreaCode("20")).toEqual([]);
		expect(getMunicipalitiesByAreaCode("DDD")).toEqual([]);
		expect(getMunicipalitiesByAreaCode(-11)).toEqual([]);
		expect(getMunicipalitiesByAreaCode("")).toEqual([]);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getMunicipalitiesByAreaCode, anyGarbage);
		});

		test("should list a municipality under the DDD getAreaCodeByMunicipalityCode gives it", () => {
			const municipalityArbitrary = fc.constantFrom(...getMunicipalities());

			fc.assert(
				fc.property(municipalityArbitrary, (municipality) => {
					const areaCode = getAreaCodeByMunicipalityCode(municipality.code) ?? 0;

					expect(getMunicipalitiesByAreaCode(areaCode)).toContainEqual(municipality);
				}),
			);
		});

		test("should list at least one municipality for every DDD in use", () => {
			for (const areaCode of VALID_AREA_CODES) {
				expect(getMunicipalitiesByAreaCode(areaCode).length).toBeGreaterThan(0);
			}
		});

		test("should list every municipality under exactly one DDD", () => {
			const listed = VALID_AREA_CODES.flatMap((areaCode) =>
				getMunicipalitiesByAreaCode(areaCode).map(({ code }) => code),
			);

			expect(listed).toHaveLength(getMunicipalities().length);
			expect(new Set(listed).size).toBe(listed.length);
		});
	});
});

describe("getMunicipalitiesByAreaCode types", () => {
	test("should take a string or number and return Municipality[]", () => {
		expectTypeOf(getMunicipalitiesByAreaCode).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getMunicipalitiesByAreaCode).returns.toEqualTypeOf<Municipality[]>();
	});
});
