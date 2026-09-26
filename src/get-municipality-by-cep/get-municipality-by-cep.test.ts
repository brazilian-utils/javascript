import * as fc from "fast-check";

import { type Municipality } from "../_internals/constants/municipalities";
import { decodeCepRanges } from "../_internals/decode-cep-ranges/decode-cep-ranges";
import { anyGarbage, digits, digitsOfOtherLength } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getMunicipalityByCode } from "../get-municipality-by-code/get-municipality-by-code";
import { CEP_RANGES as PACKED_CEP_RANGES } from "./constants";
import { getMunicipalityByCep } from "./get-municipality-by-cep";

const CEP_RANGES = decodeCepRanges(PACKED_CEP_RANGES);

describe("getMunicipalityByCep", () => {
	it("should return São Paulo for a formatted CEP of Avenida Paulista", () => {
		expect(getMunicipalityByCep("01310-100")).toEqual({
			code: "3550308",
			name: "São Paulo",
			stateCode: "SP",
		});
	});

	it("should return Rio de Janeiro for a CEP given as a number", () => {
		expect(getMunicipalityByCep(20_040_020)).toEqual({
			code: "3304557",
			name: "Rio de Janeiro",
			stateCode: "RJ",
		});
	});

	it("should accept the punctuated forms isValidCep accepts", () => {
		expect(getMunicipalityByCep("92.500-000")?.stateCode).toBe("RS");
		expect(getMunicipalityByCep("70 040 010")?.stateCode).toBe("DF");
	});

	it("should return the owner of the first and of the last CEP of the whole table", () => {
		expect(getMunicipalityByCep("01000-001")).toEqual({
			code: "3550308",
			name: "São Paulo",
			stateCode: "SP",
		});
		expect(getMunicipalityByCep("99999-999")).toEqual({
			code: "4312625",
			name: "Muliterno",
			stateCode: "RS",
		});
	});

	it("should return null for a CEP below the first range", () => {
		expect(getMunicipalityByCep("00000000")).toBeNull();
		expect(getMunicipalityByCep("00999999")).toBeNull();
	});

	it("should return null for the gap between Mato Grosso and Mato Grosso do Sul", () => {
		expect(getMunicipalityByCep("78900000")).toBeNull();
		expect(getMunicipalityByCep("78999999")).toBeNull();
	});

	it("should return a fresh copy that does not mutate the underlying constant", () => {
		const municipality = getMunicipalityByCep("01310100");

		if (municipality) Object.assign(municipality, { name: "X" });

		expect(getMunicipalityByCep("01310100")?.name).toBe("São Paulo");
	});

	it("should return null for a CEP with the wrong length", () => {
		expect(getMunicipalityByCep("12345")).toBeNull();
		expect(getMunicipalityByCep("013101000")).toBeNull();
		expect(getMunicipalityByCep(1_310_100)).toBeNull();
		expect(getMunicipalityByCep("")).toBeNull();
	});

	it("should return null for a value with a letter, not read its digits alone", () => {
		expect(getMunicipalityByCep("abc01310100")).toBeNull();
		expect(getMunicipalityByCep("01310-10a")).toBeNull();
	});

	it("should return null for a negative or a fractional number", () => {
		expect(getMunicipalityByCep(-20_040_020)).toBeNull();
		expect(getMunicipalityByCep(2_004_002.5)).toBeNull();
	});

	it("should return null for values that are not a string or a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCep(null)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCep()).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCep(["01310100"])).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getMunicipalityByCep({ toString: () => "01310100" })).toBeNull();
		expect(getMunicipalityByCep("__proto__")).toBeNull();
	});

	it("should hold a table in ascending, non-overlapping order", () => {
		for (const [index, range] of CEP_RANGES.slice(1).entries()) {
			const previous = CEP_RANGES[index];

			expect(range.start).toBeGreaterThan(previous.end);
		}

		expect(CEP_RANGES[0].start).toBe(1_000_001);
		expect(CEP_RANGES.at(-1)?.end).toBe(99_999_999);
	});

	it("should reference only IBGE codes getMunicipalityByCode resolves", () => {
		for (const range of CEP_RANGES) {
			expect(getMunicipalityByCode(range.code)).not.toBeNull();
		}
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getMunicipalityByCep, anyGarbage);
		});

		test("should return null for digits of any length other than 8", () => {
			fc.assert(
				fc.property(digitsOfOtherLength(12, [8]), (value) => {
					expect(getMunicipalityByCep(value)).toBeNull();
				}),
			);
		});

		test("should answer the same for a CEP with and without its hyphen", () => {
			fc.assert(
				fc.property(digits(8), (cep) => {
					expect(getMunicipalityByCep(`${cep.slice(0, 5)}-${cep.slice(5)}`)).toEqual(
						getMunicipalityByCep(cep),
					);
				}),
			);
		});

		test("should resolve every CEP range to the municipality getMunicipalityByCode resolves its code to", () => {
			const rangeArbitrary = fc.constantFrom(...CEP_RANGES);

			fc.assert(
				fc.property(rangeArbitrary, (range) => {
					expect(getMunicipalityByCep(String(range.start).padStart(8, "0"))).toEqual(
						getMunicipalityByCode(range.code),
					);
					expect(getMunicipalityByCep(String(range.end).padStart(8, "0"))).toEqual(
						getMunicipalityByCode(range.code),
					);
				}),
			);
		});
	});
});

describe("getMunicipalityByCep types", () => {
	test("should take a string or number and return a Municipality or null", () => {
		expectTypeOf(getMunicipalityByCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getMunicipalityByCep).returns.toEqualTypeOf<Municipality | null>();
	});
});
