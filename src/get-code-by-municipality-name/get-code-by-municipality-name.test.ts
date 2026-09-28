import * as fc from "fast-check";

import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getMunicipalities } from "../get-municipalities/get-municipalities";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { getStates } from "../get-states/get-states";
import {
	type GetCodeByMunicipalityNameParams,
	getCodeByMunicipalityName,
} from "./get-code-by-municipality-name";

describe("getCodeByMunicipalityName", () => {
	it("should return the code of Conceição do Coité, as the Python library's example does", () => {
		expect(
			getCodeByMunicipalityName({ municipalityName: "Conceição do Coité", stateCode: "Ba" }),
		).toBe("2908408");
	});

	it("should ignore accents, the cedilla and casing in the name", () => {
		expect(
			getCodeByMunicipalityName({ municipalityName: "conceicao do coite", stateCode: "BA" }),
		).toBe("2908408");
		expect(
			getCodeByMunicipalityName({ municipalityName: "CONCEIÇÃO DO COITÉ", stateCode: "BA" }),
		).toBe("2908408");
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "SP" })).toBe(
			"3550308",
		);
		expect(getCodeByMunicipalityName({ municipalityName: "sao paulo", stateCode: "SP" })).toBe(
			"3550308",
		);
	});

	it("should collapse runs of whitespace and trim the name, but not join words", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "  sao  paulo ", stateCode: "SP" })).toBe(
			"3550308",
		);
		expect(getCodeByMunicipalityName({ municipalityName: "sao\tpaulo", stateCode: "SP" })).toBe(
			"3550308",
		);
		expect(getCodeByMunicipalityName({ municipalityName: "saopaulo", stateCode: "SP" })).toBeNull();
	});

	it("should keep the hyphen of a name", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "Ceara-Mirim", stateCode: "RN" })).toBe(
			"2402600",
		);
	});

	it("should fold the casing to upper case, so ß reads as SS", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "Paßos", stateCode: "MG" })).toBe(
			"3147907",
		);
	});

	it("should ignore casing and surrounding whitespace in the state code", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "sp" })).toBe(
			"3550308",
		);
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: " Sp " })).toBe(
			"3550308",
		);
	});

	it("should tell apart municipalities of the same name in different states", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "Bom Jesus", stateCode: "PI" })).toBe(
			"2201903",
		);
		expect(getCodeByMunicipalityName({ municipalityName: "Bom Jesus", stateCode: "RS" })).toBe(
			"4302303",
		);
	});

	it("should return null for a municipality of another state", () => {
		expect(
			getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "RJ" }),
		).toBeNull();
	});

	it("should return null for a municipality that does not exist", () => {
		expect(
			getCodeByMunicipalityName({ municipalityName: "Municipio Inexistente", stateCode: "RS" }),
		).toBeNull();
	});

	it("should return null for a state code that is not a state", () => {
		expect(
			getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "XX" }),
		).toBeNull();
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "" })).toBeNull();
		expect(
			getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "__proto__" }),
		).toBeNull();
		expect(
			getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "SPX" }),
		).toBeNull();
	});

	it("should return null for an empty name", () => {
		expect(getCodeByMunicipalityName({ municipalityName: "", stateCode: "SP" })).toBeNull();
		expect(getCodeByMunicipalityName({ municipalityName: "   ", stateCode: "SP" })).toBeNull();
	});

	it("should return null for arguments that are not strings", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName({ municipalityName: null, stateCode: "SP" })).toBeNull();
		expect(
			// @ts-expect-error: intentionally invalid input
			getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: null }),
		).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: 35 })).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName()).toBeNull();
	});

	it("should return null when the params are missing or are not an object with both fields", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName(null)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName({})).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName({ municipalityName: "São Paulo" })).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName({ stateCode: "SP" })).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName("São Paulo")).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName("São Paulo", { stateCode: "SP" })).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(
				(value) => getCodeByMunicipalityName({ municipalityName: value, stateCode: "SP" }),
				anyGarbage,
			);
			expectNeverThrows(
				(value) => getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: value }),
				anyGarbage,
			);
			expectNeverThrows((value) => getCodeByMunicipalityName(value), anyGarbage);
		});

		test("should find every municipality of every state by its own name", () => {
			for (const { code: stateCode } of getStates()) {
				for (const municipality of getMunicipalities(stateCode)) {
					expect(
						getCodeByMunicipalityName({ municipalityName: municipality.name, stateCode }),
					).toBe(municipality.code);
				}
			}
		});

		test("should return a code that getMunicipalityByCode resolves back to the same state", () => {
			const municipalityArbitrary = fc.constantFrom(
				...getStates().flatMap(({ code }) => getMunicipalities(code)),
			);

			fc.assert(
				fc.property(municipalityArbitrary, ({ name, stateCode }) => {
					const code = getCodeByMunicipalityName({
						municipalityName: name.toLowerCase(),
						stateCode: stateCode.toLowerCase(),
					});

					expect(code === null ? null : getMunicipalityByCode(code)?.stateCode).toBe(stateCode);
				}),
			);
		});
	});
});

describe("getCodeByMunicipalityName types", () => {
	test("should take one object with the name and the state code, and return a string or null", () => {
		expectTypeOf(getCodeByMunicipalityName).parameters.toEqualTypeOf<
			[GetCodeByMunicipalityNameParams]
		>();
		expectTypeOf<GetCodeByMunicipalityNameParams>().toEqualTypeOf<{
			municipalityName: string;
			stateCode: string;
		}>();
		expectTypeOf(getCodeByMunicipalityName).returns.toEqualTypeOf<string | null>();
	});
});
