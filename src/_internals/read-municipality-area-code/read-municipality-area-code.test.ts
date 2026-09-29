import { DATA as CITIES_DATA } from "../constants/municipalities";
import { describe, expect, test } from "../test/runtime";
import { readMunicipalityAreaCode } from "./read-municipality-area-code";

describe("readMunicipalityAreaCode", () => {
	test("should read the DDD of a municipality", () => {
		expect(readMunicipalityAreaCode("SP", "3550308")).toBe(11);
		expect(readMunicipalityAreaCode("SP", "3509502")).toBe(19);
		expect(readMunicipalityAreaCode("SC", "4213609")).toBe(42);
	});

	test("should read the first and the last municipality of a state, by code", () => {
		const codes = CITIES_DATA.AM.map(([, code]) => code).sort();

		expect(readMunicipalityAreaCode("AM", codes[0] ?? "")).toBe(97);
		expect(readMunicipalityAreaCode("AM", codes.at(-1) ?? "")).toBe(92);
	});

	test("should give the same answer on a second lookup of the state", () => {
		expect(readMunicipalityAreaCode("AC", "1200401")).toBe(68);
		expect(readMunicipalityAreaCode("AC", "1200401")).toBe(68);
	});

	test("should give NaN for a key that only exists on Object.prototype", () => {
		expect(Number.isNaN(readMunicipalityAreaCode("SP", "constructor"))).toBe(true);
		expect(Number.isNaN(readMunicipalityAreaCode("SP", "__proto__"))).toBe(true);
		expect(Number.isNaN(readMunicipalityAreaCode("SP", "toString"))).toBe(true);
	});
});
