import * as fc from "fast-check";

import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getMunicipalities } from "../get-municipalities/get-municipalities";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { getStates } from "../get-states/get-states";
import { getCodeByMunicipalityName } from "./get-code-by-municipality-name";

describe("getCodeByMunicipalityName", () => {
	it("should return the code of Conceição do Coité, as the Python library's example does", () => {
		expect(getCodeByMunicipalityName("Conceição do Coité", "Ba")).toBe("2908408");
	});

	it("should ignore accents, the cedilla and casing in the name", () => {
		expect(getCodeByMunicipalityName("conceicao do coite", "BA")).toBe("2908408");
		expect(getCodeByMunicipalityName("CONCEIÇÃO DO COITÉ", "BA")).toBe("2908408");
		expect(getCodeByMunicipalityName("São Paulo", "SP")).toBe("3550308");
		expect(getCodeByMunicipalityName("sao paulo", "SP")).toBe("3550308");
	});

	it("should collapse runs of whitespace and trim the name, but not join words", () => {
		expect(getCodeByMunicipalityName("  sao  paulo ", "SP")).toBe("3550308");
		expect(getCodeByMunicipalityName("sao\tpaulo", "SP")).toBe("3550308");
		expect(getCodeByMunicipalityName("saopaulo", "SP")).toBeNull();
	});

	it("should keep the hyphen of a name", () => {
		expect(getCodeByMunicipalityName("Ceara-Mirim", "RN")).toBe("2402600");
	});

	it("should fold the casing to upper case, so ß reads as SS", () => {
		expect(getCodeByMunicipalityName("Paßos", "MG")).toBe("3147907");
	});

	it("should ignore casing and surrounding whitespace in the state code", () => {
		expect(getCodeByMunicipalityName("São Paulo", "sp")).toBe("3550308");
		expect(getCodeByMunicipalityName("São Paulo", " Sp ")).toBe("3550308");
	});

	it("should tell apart municipalities of the same name in different states", () => {
		expect(getCodeByMunicipalityName("Bom Jesus", "PI")).toBe("2201903");
		expect(getCodeByMunicipalityName("Bom Jesus", "RS")).toBe("4302303");
	});

	it("should return null for a municipality of another state", () => {
		expect(getCodeByMunicipalityName("São Paulo", "RJ")).toBeNull();
	});

	it("should return null for a municipality that does not exist", () => {
		expect(getCodeByMunicipalityName("Municipio Inexistente", "RS")).toBeNull();
	});

	it("should return null for a state code that is not a state", () => {
		expect(getCodeByMunicipalityName("São Paulo", "XX")).toBeNull();
		expect(getCodeByMunicipalityName("São Paulo", "")).toBeNull();
		expect(getCodeByMunicipalityName("São Paulo", "__proto__")).toBeNull();
		expect(getCodeByMunicipalityName("São Paulo", "SPX")).toBeNull();
	});

	it("should return null for an empty name", () => {
		expect(getCodeByMunicipalityName("", "SP")).toBeNull();
		expect(getCodeByMunicipalityName("   ", "SP")).toBeNull();
	});

	it("should return null for arguments that are not strings", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName(null, "SP")).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName("São Paulo", null)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName("São Paulo", 35)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getCodeByMunicipalityName()).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows((value) => getCodeByMunicipalityName(value, "SP"), anyGarbage);
			expectNeverThrows((value) => getCodeByMunicipalityName("São Paulo", value), anyGarbage);
		});

		test("should find every municipality of every state by its own name", () => {
			for (const { code: stateCode } of getStates()) {
				for (const municipality of getMunicipalities(stateCode)) {
					expect(getCodeByMunicipalityName(municipality.name, stateCode)).toBe(municipality.code);
				}
			}
		});

		test("should return a code that getMunicipalityByCode resolves back to the same state", () => {
			const municipalityArbitrary = fc.constantFrom(
				...getStates().flatMap(({ code }) => getMunicipalities(code)),
			);

			fc.assert(
				fc.property(municipalityArbitrary, ({ name, stateCode }) => {
					const code = getCodeByMunicipalityName(name.toLowerCase(), stateCode.toLowerCase());

					expect(code === null ? null : getMunicipalityByCode(code)?.stateCode).toBe(stateCode);
				}),
			);
		});
	});
});

describe("getCodeByMunicipalityName types", () => {
	test("should take a name and a state code and return a string or null", () => {
		expectTypeOf(getCodeByMunicipalityName).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getCodeByMunicipalityName).parameter(1).toEqualTypeOf<string>();
		expectTypeOf(getCodeByMunicipalityName).returns.toEqualTypeOf<string | null>();
	});
});
