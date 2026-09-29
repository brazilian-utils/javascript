import { STATE_CODES } from "../constants/state-codes";
import { describe, expect, test } from "../test/runtime";
import { readMunicipalities } from "./read-municipalities";

describe("readMunicipalities", () => {
	test("should read the name and the code of the only municipality of a state", () => {
		expect(readMunicipalities("DF")).toEqual([["Brasília", "5300108"]]);
	});

	test("should read the municipalities of a state sorted by name", () => {
		const [first, second] = readMunicipalities("AC");

		expect(first).toEqual(["Acrelândia", "1200013"]);
		expect(second).toEqual(["Assis Brasil", "1200054"]);
		expect(readMunicipalities("SP")).toContainEqual(["São Paulo", "3550308"]);
	});

	test("should read 5,571 municipalities with a name and a code each", () => {
		const municipalities = STATE_CODES.flatMap((stateCode) => readMunicipalities(stateCode));

		expect(municipalities).toHaveLength(5571);

		for (const [name, code] of municipalities) {
			expect(name).not.toBe("");
			expect(code).toMatch(/^\d{7}$/);
		}
	});

	test("should hand back the same array on a second read", () => {
		expect(readMunicipalities("AC")).toBe(readMunicipalities("AC"));
	});
});
