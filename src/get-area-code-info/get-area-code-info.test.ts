import * as fc from "fast-check";

import { VALID_AREA_CODES } from "../_internals/constants/area-codes";
import { type StateCode, type StateName } from "../_internals/constants/states";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getAreaCodesByState } from "../get-area-codes-by-state/get-area-codes-by-state";
import { getAreaCodeInfo, type AreaCodeInfo } from "./get-area-code-info";

describe("getAreaCodeInfo", () => {
	it("should resolve DDD 11 to São Paulo, Sudeste, from a string", () => {
		expect(getAreaCodeInfo("11")).toEqual({
			areaCode: 11,
			stateCode: "SP",
			stateName: "São Paulo",
			regionCode: "SE",
			regionName: "Sudeste",
			stateCodes: ["SP"],
		});
	});

	it("should resolve DDD 11 to São Paulo, Sudeste, from a number", () => {
		expect(getAreaCodeInfo(11)).toEqual({
			areaCode: 11,
			stateCode: "SP",
			stateName: "São Paulo",
			regionCode: "SE",
			regionName: "Sudeste",
			stateCodes: ["SP"],
		});
	});

	it("should resolve DDD 21 to Rio de Janeiro, per the Anatel Plano Geral de Numeração", () => {
		expect(getAreaCodeInfo("21")?.stateCode).toBe("RJ");
	});

	it("should resolve DDD 68 to Acre, Norte", () => {
		expect(getAreaCodeInfo("68")).toEqual({
			areaCode: 68,
			stateCode: "AC",
			stateName: "Acre",
			regionCode: "N",
			regionName: "Norte",
			stateCodes: ["AC"],
		});
	});

	it("should resolve DDD 61 to Distrito Federal, Centro-Oeste, and list Goiás as a second state", () => {
		expect(getAreaCodeInfo("61")).toEqual({
			areaCode: 61,
			stateCode: "DF",
			stateName: "Distrito Federal",
			regionCode: "CO",
			regionName: "Centro-Oeste",
			stateCodes: ["DF", "GO"],
		});
	});

	it("should keep DDD 61 singular in stateCode, since the Entorno is the exception", () => {
		expect(getAreaCodeInfo(61)?.stateCode).toBe("DF");
	});

	it("should list both states of the three other border DDDs, 42, 47 and 49", () => {
		expect(getAreaCodeInfo(42)?.stateCodes).toEqual(["PR", "SC"]);
		expect(getAreaCodeInfo(47)?.stateCodes).toEqual(["SC", "PR"]);
		expect(getAreaCodeInfo(49)?.stateCodes).toEqual(["SC", "PR"]);
	});

	it("should list a single state for a DDD that does not cross a border", () => {
		expect(getAreaCodeInfo(62)?.stateCodes).toEqual(["GO"]);
	});

	it("should resolve every one of the 67 valid DDDs to a state (Anatel Plano Geral de Numeração)", () => {
		const ddds = [
			11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42,
			43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74,
			75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
		];

		for (const ddd of ddds) {
			expect(getAreaCodeInfo(ddd)?.areaCode).toBe(ddd);
		}

		expect(ddds.length).toBe(67);
	});

	it("should map DDD 41, 42 (Ponta Grossa and Guarapuava), 43, 44, 45 and 46 to Paraná and 47, 48 and 49 to Santa Catarina", () => {
		for (const ddd of ["41", "42", "43", "44", "45", "46"]) {
			expect(getAreaCodeInfo(ddd)?.stateCode).toBe("PR");
		}
		for (const ddd of ["47", "48", "49"]) {
			expect(getAreaCodeInfo(ddd)?.stateCode).toBe("SC");
		}
	});

	it("should ignore non-digit characters around the DDD", () => {
		expect(getAreaCodeInfo(" 11 ")?.stateCode).toBe("SP");
	});

	it("should ignore a parentheses mask around the DDD", () => {
		expect(getAreaCodeInfo("(11)")?.stateCode).toBe("SP");
	});

	it("should return null for a DDD that does not exist, such as 00", () => {
		expect(getAreaCodeInfo("00")).toBeNull();
	});

	it("should return null for a DDD that does not exist, such as 20", () => {
		expect(getAreaCodeInfo("20")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getAreaCodeInfo("")).toBeNull();
	});

	it("should return null for a negative number, not read it as the DDD 11", () => {
		expect(getAreaCodeInfo(-11)).toBeNull();
	});

	it("should return null for a fractional number, not read it as the DDD 11", () => {
		expect(getAreaCodeInfo(1.1)).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getAreaCodeInfo(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getAreaCodeInfo()).toBeNull();
	});

	describe("properties", () => {
		const areaCodeArbitrary = fc.constantFrom(...VALID_AREA_CODES);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getAreaCodeInfo, anyGarbage);
		});

		test("should resolve every valid DDD back to every state that lists it", () => {
			fc.assert(
				fc.property(areaCodeArbitrary, (areaCode) => {
					const info = getAreaCodeInfo(areaCode);

					expect(info).not.toBeNull();
					expect(info?.stateCodes[0]).toBe(info?.stateCode);

					for (const stateCode of info?.stateCodes ?? []) {
						expect(getAreaCodesByState(stateCode)).toContain(areaCode);
					}
				}),
			);
		});

		test("should never repeat a state in stateCodes", () => {
			fc.assert(
				fc.property(areaCodeArbitrary, (areaCode) => {
					const stateCodes = getAreaCodeInfo(areaCode)?.stateCodes ?? [];

					expect(new Set(stateCodes).size).toBe(stateCodes.length);
				}),
			);
		});

		test("should resolve the same DDD whether given as a string or a number", () => {
			fc.assert(
				fc.property(areaCodeArbitrary, (areaCode) => {
					expect(getAreaCodeInfo(String(areaCode))).toEqual(getAreaCodeInfo(areaCode));
				}),
			);
		});
	});
});

describe("getAreaCodeInfo types", () => {
	test("should take a string or number and return an AreaCodeInfo or null", () => {
		expectTypeOf(getAreaCodeInfo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getAreaCodeInfo).returns.toEqualTypeOf<AreaCodeInfo | null>();
		expectTypeOf<AreaCodeInfo>().toEqualTypeOf<{
			areaCode: number;
			stateCode: StateCode;
			stateName: StateName;
			regionCode: "N" | "NE" | "CO" | "SE" | "S";
			regionName: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
			stateCodes: StateCode[];
		}>();
	});
});
