import * as fc from "fast-check";

import { VALID_AREA_CODES } from "../_internals/constants/area-codes";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getAreaCodeInfo } from "../get-area-code-info/get-area-code-info";
import { getMunicipalities } from "../get-municipalities/get-municipalities";
import { getAreaCodeByMunicipalityCode } from "./get-area-code-by-municipality-code";

describe("getAreaCodeByMunicipalityCode", () => {
	it("should return the DDD of a municipality, per the Anatel Códigos Nacionais table", () => {
		expect(getAreaCodeByMunicipalityCode("3550308")).toBe(11);
		expect(getAreaCodeByMunicipalityCode("3509502")).toBe(19);
		expect(getAreaCodeByMunicipalityCode("3304557")).toBe(21);
		expect(getAreaCodeByMunicipalityCode("1200401")).toBe(68);
		expect(getAreaCodeByMunicipalityCode("2605459")).toBe(81);
	});

	it("should take the code as a number", () => {
		expect(getAreaCodeByMunicipalityCode(3_518_800)).toBe(11);
	});

	it("should ignore whitespace and hyphens, the same as getMunicipalityByCode", () => {
		expect(getAreaCodeByMunicipalityCode(" 355-030-8 ")).toBe(11);
	});

	it("should give 61 to Brasília and to the Goiás municipalities around it", () => {
		expect(getAreaCodeByMunicipalityCode("5300108")).toBe(61);
		expect(getAreaCodeByMunicipalityCode("5212501")).toBe(61);
		expect(getAreaCodeByMunicipalityCode("5222203")).toBe(61);
	});

	it("should give the three municipalities that dial a neighboring state's DDD that DDD", () => {
		expect(getAreaCodeByMunicipalityCode("4213609")).toBe(42);
		expect(getAreaCodeByMunicipalityCode("4122305")).toBe(47);
		expect(getAreaCodeByMunicipalityCode("4102604")).toBe(49);
	});

	it("should return null for a code that is not a municipality", () => {
		expect(getAreaCodeByMunicipalityCode("0000000")).toBeNull();
		expect(getAreaCodeByMunicipalityCode("355030")).toBeNull();
		expect(getAreaCodeByMunicipalityCode("")).toBeNull();
	});

	it("should return null for a code with a letter, a negative or a fractional number", () => {
		expect(getAreaCodeByMunicipalityCode("355030a8")).toBeNull();
		expect(getAreaCodeByMunicipalityCode(-3_550_308)).toBeNull();
		expect(getAreaCodeByMunicipalityCode(355_030.8)).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getAreaCodeByMunicipalityCode, anyGarbage);
		});

		test("should give every municipality a DDD in use that lists its state", () => {
			const municipalityArbitrary = fc.constantFrom(...getMunicipalities());

			fc.assert(
				fc.property(municipalityArbitrary, (municipality) => {
					const areaCode = getAreaCodeByMunicipalityCode(municipality.code);

					expect(VALID_AREA_CODES).toContain(areaCode);
					expect(getAreaCodeInfo(areaCode ?? 0)?.stateCodes).toContain(municipality.stateCode);
				}),
			);
		});
	});
});

describe("getAreaCodeByMunicipalityCode types", () => {
	test("should take a string or number and return a number or null", () => {
		expectTypeOf(getAreaCodeByMunicipalityCode).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getAreaCodeByMunicipalityCode).returns.toEqualTypeOf<number | null>();
	});
});
