import * as fc from "fast-check";

import { type State } from "../_internals/constants/states";
import { anyGarbage, digits, digitsOfOtherLength } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStateByCep } from "./get-state-by-cep";

const RANGE_BOUNDARIES: [string, string, string][] = [
	["SP", "01000000", "19999999"],
	["RJ", "20000000", "28999999"],
	["ES", "29000000", "29999999"],
	["MG", "30000000", "39999999"],
	["BA", "40000000", "48999999"],
	["SE", "49000000", "49999999"],
	["PE", "50000000", "56999999"],
	["AL", "57000000", "57999999"],
	["PB", "58000000", "58999999"],
	["RN", "59000000", "59999999"],
	["CE", "60000000", "63999999"],
	["PI", "64000000", "64999999"],
	["MA", "65000000", "65999999"],
	["PA", "66000000", "68899999"],
	["AP", "68900000", "68999999"],
	["AM", "69000000", "69299999"],
	["RR", "69300000", "69399999"],
	["AM", "69400000", "69899999"],
	["AC", "69900000", "69999999"],
	["DF", "70000000", "72799999"],
	["GO", "72800000", "72999999"],
	["DF", "73000000", "73699999"],
	["GO", "73700000", "76799999"],
	["RO", "76800000", "76999999"],
	["TO", "77000000", "77999999"],
	["MT", "78000000", "78899999"],
	["MS", "79000000", "79999999"],
	["PR", "80000000", "87999999"],
	["SC", "88000000", "89999999"],
	["RS", "90000000", "99999999"],
];

describe("getStateByCep", () => {
	it("should return São Paulo for a formatted CEP of Avenida Paulista", () => {
		expect(getStateByCep("01310-100")).toEqual({
			code: "SP",
			name: "São Paulo",
			regionCode: "SE",
			regionName: "Sudeste",
			ibgeCode: 35,
		});
	});

	it("should return Rio de Janeiro for a CEP given as a number", () => {
		expect(getStateByCep(20_040_020)).toEqual({
			code: "RJ",
			name: "Rio de Janeiro",
			regionCode: "SE",
			regionName: "Sudeste",
			ibgeCode: 33,
		});
	});

	it("should accept the punctuated forms isValidCep accepts", () => {
		expect(getStateByCep("92.500-000")?.code).toBe("RS");
		expect(getStateByCep("70 040 010")?.code).toBe("DF");
	});

	it("should return the owner of the first and of the last CEP of every range", () => {
		for (const [code, first, last] of RANGE_BOUNDARIES) {
			expect(getStateByCep(first)?.code).toBe(code);
			expect(getStateByCep(last)?.code).toBe(code);
		}
	});

	it("should return a CEP in the middle of a range", () => {
		expect(getStateByCep("69050000")?.code).toBe("AM");
		expect(getStateByCep("69650000")?.code).toBe("AM");
		expect(getStateByCep("71000000")?.code).toBe("DF");
		expect(getStateByCep("73350000")?.code).toBe("DF");
		expect(getStateByCep("72900000")?.code).toBe("GO");
		expect(getStateByCep("74000000")?.code).toBe("GO");
	});

	it("should return null for the CEPs below the first range", () => {
		expect(getStateByCep("00000000")).toBeNull();
		expect(getStateByCep("00999999")).toBeNull();
	});

	it("should return null for the gap between Mato Grosso and Mato Grosso do Sul", () => {
		expect(getStateByCep("78900000")).toBeNull();
		expect(getStateByCep("78950000")).toBeNull();
		expect(getStateByCep("78999999")).toBeNull();
	});

	it("should return a fresh copy that does not mutate the underlying constant", () => {
		const state = getStateByCep("01310100");
		if (state) Object.assign(state, { name: "X" });

		expect(getStateByCep("01310100")?.name).toBe("São Paulo");
	});

	it("should return null for a CEP with the wrong length", () => {
		expect(getStateByCep("12345")).toBeNull();
		expect(getStateByCep("013101000")).toBeNull();
		expect(getStateByCep(1_310_100)).toBeNull();
		expect(getStateByCep("")).toBeNull();
	});

	it("should return null for a value with a letter, not read its digits alone", () => {
		expect(getStateByCep("abc01310100")).toBeNull();
		expect(getStateByCep("01310-10a")).toBeNull();
	});

	it("should return null for a negative or a fractional number", () => {
		expect(getStateByCep(-20_040_020)).toBeNull();
		expect(getStateByCep(2_004_002.5)).toBeNull();
	});

	it("should return null for values that are not a string or a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateByCep(null)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getStateByCep()).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getStateByCep(["01310100"])).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(getStateByCep({ toString: () => "01310100" })).toBeNull();
		expect(getStateByCep("__proto__")).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getStateByCep, anyGarbage);
		});

		test("should return null for digits of any length other than 8", () => {
			fc.assert(
				fc.property(digitsOfOtherLength(12, [8]), (value) => {
					expect(getStateByCep(value)).toBeNull();
				}),
			);
		});

		test("should answer the same for a CEP with and without its hyphen", () => {
			fc.assert(
				fc.property(digits(8), (cep) => {
					expect(getStateByCep(`${cep.slice(0, 5)}-${cep.slice(5)}`)).toEqual(getStateByCep(cep));
				}),
			);
		});

		test("should place every CEP from 80000-000 up in the Sul region", () => {
			fc.assert(
				fc.property(fc.integer({ min: 80_000_000, max: 99_999_999 }), (cep) => {
					expect(getStateByCep(cep)?.regionCode).toBe("S");
				}),
			);
		});
	});
});

describe("getStateByCep types", () => {
	test("should take a string or number and return a State or null", () => {
		expectTypeOf(getStateByCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getStateByCep).returns.toEqualTypeOf<State | null>();
	});
});
