import { describe, expect, it } from "../_internals/test/runtime";
import { getAreaCodeInfo } from "./get-area-code-info";

describe("getAreaCodeInfo", () => {
	it("should resolve DDD 11 to São Paulo, Sudeste, from a string", () => {
		expect(getAreaCodeInfo("11")).toEqual({
			areaCode: 11,
			stateCode: "SP",
			stateName: "São Paulo",
			region: "Sudeste",
		});
	});

	it("should resolve DDD 11 to São Paulo, Sudeste, from a number", () => {
		expect(getAreaCodeInfo(11)).toEqual({
			areaCode: 11,
			stateCode: "SP",
			stateName: "São Paulo",
			region: "Sudeste",
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
			region: "Norte",
		});
	});

	it("should resolve DDD 61 to Distrito Federal, Centro-Oeste", () => {
		expect(getAreaCodeInfo("61")).toEqual({
			areaCode: 61,
			stateCode: "DF",
			stateName: "Distrito Federal",
			region: "Centro-Oeste",
		});
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

	it("should return null for null", () => {
		// @ts-expect-error
		expect(getAreaCodeInfo(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error
		expect(getAreaCodeInfo(undefined)).toBeNull();
	});
});
