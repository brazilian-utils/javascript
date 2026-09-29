import { STATE_CODES } from "../constants/state-codes";
import { readMunicipalityStateCode } from "../read-municipality-state-code/read-municipality-state-code";
import { describe, expect, test } from "../test/runtime";
import { readMunicipalityCodes } from "./read-municipality-codes";

describe("readMunicipalityCodes", () => {
	test("should read the code of the only municipality of a state", () => {
		expect(readMunicipalityCodes("DF")).toEqual(["5300108"]);
	});

	test("should read the codes in the order of the municipality names", () => {
		expect(readMunicipalityCodes("AC").slice(0, 3)).toEqual(["1200013", "1200054", "1200104"]);
		expect(readMunicipalityCodes("SP")[readMunicipalityCodes("SP").indexOf("3550308")]).toBe(
			"3550308",
		);
	});

	test("should read a code whose check digit breaks the rule", () => {
		const codes = STATE_CODES.flatMap((stateCode) => readMunicipalityCodes(stateCode));

		for (const code of [
			"5203939",
			"5203962",
			"3117836",
			"3152131",
			"2611533",
			"2201919",
			"2201988",
			"2202251",
			"4305871",
		]) {
			expect(codes).toContain(code);
		}
	});

	test("should read 5,571 distinct 7 digit codes whose first two digits are the state", () => {
		const codes = STATE_CODES.flatMap((stateCode) => readMunicipalityCodes(stateCode));

		expect(codes).toHaveLength(5571);
		expect(new Set(codes).size).toBe(5571);

		for (const code of codes) {
			expect(code).toMatch(/^\d{7}$/);
		}
	});

	test("should read codes whose first two digits are the state they are listed under", () => {
		for (const stateCode of STATE_CODES) {
			for (const code of readMunicipalityCodes(stateCode)) {
				expect(readMunicipalityStateCode(code)).toBe(stateCode);
			}
		}
	});

	test("should hand back the same array on a second read", () => {
		expect(readMunicipalityCodes("AC")).toBe(readMunicipalityCodes("AC"));
	});
});
