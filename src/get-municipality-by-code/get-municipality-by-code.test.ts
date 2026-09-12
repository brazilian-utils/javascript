import * as fc from "fast-check";

import { type Municipality } from "../_internals/constants/cities";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getMunicipalities } from "../get-municipalities/get-municipalities";
import { getMunicipalityByCode } from "./get-municipality-by-code";

describe("getMunicipalityByCode", () => {
	it("should return the municipality for a known code (string)", () => {
		expect(getMunicipalityByCode("3550308")).toEqual({
			code: "3550308",
			name: "São Paulo",
			stateCode: "SP",
		});
	});

	it("should return the municipality for a known code (number)", () => {
		expect(getMunicipalityByCode(3_550_308)).toEqual({
			code: "3550308",
			name: "São Paulo",
			stateCode: "SP",
		});
	});

	it("should resolve Boa Esperança do Norte/MT", () => {
		expect(getMunicipalityByCode("5101837")).toEqual({
			code: "5101837",
			name: "Boa Esperança do Norte",
			stateCode: "MT",
		});
	});

	it("should return a fresh object so mutating the result does not affect subsequent calls", () => {
		const municipality = getMunicipalityByCode("3550308");

		if (municipality) municipality.name = "MUTATED";

		expect(getMunicipalityByCode("3550308")?.name).toBe("São Paulo");
	});

	it("should return null for an unknown 7 digit code", () => {
		expect(getMunicipalityByCode("0000000")).toBeNull();
	});

	it("should return null for a code with the wrong number of digits", () => {
		expect(getMunicipalityByCode("123")).toBeNull();
		expect(getMunicipalityByCode("12345678")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getMunicipalityByCode("")).toBeNull();
	});

	it("should return null for an object even if its string representation looks like a valid code", () => {
		expect(
			// @ts-expect-error: intentionally invalid input
			getMunicipalityByCode({ toString: () => "3550308" }),
		).toBeNull();
	});

	it("should return null for a non-string, non-number value", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCode(null)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCode()).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCode(true)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCode({})).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCode([])).toBeNull();
	});

	it("should ignore non-digit characters before validating the length", () => {
		expect(getMunicipalityByCode("355-030-8")).toEqual({
			code: "3550308",
			name: "São Paulo",
			stateCode: "SP",
		});
	});

	describe("properties", () => {
		const municipalityArbitrary = fc.constantFrom(...getMunicipalities());

		test("should never throw, regardless of the input", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(() => getMunicipalityByCode(value as never)).not.toThrow();
				}),
			);
		});

		test("should resolve every known municipality code, as a string or as a number", () => {
			fc.assert(
				fc.property(municipalityArbitrary, (municipality) => {
					expect(getMunicipalityByCode(municipality.code)).toEqual(municipality);
					expect(getMunicipalityByCode(Number(municipality.code))).toEqual(municipality);
				}),
			);
		});
	});
});

describe("getMunicipalityByCode types", () => {
	test("should take a string or number and return a Municipality or null", () => {
		expectTypeOf(getMunicipalityByCode).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getMunicipalityByCode).returns.toEqualTypeOf<Municipality | null>();
	});
});
