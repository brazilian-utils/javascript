import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import { anyGarbage, anyText, anyValue, stateCodes } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatCpf } from "../format-cpf/format-cpf";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";
import { type CpfInfo, getCpfInfo } from "./get-cpf-info";

const REGIONS: [string, CpfInfo][] = [
	[
		"40152673113",
		{
			base: "40152673",
			fiscalRegion: "1",
			states: ["DF", "GO", "MT", "MS", "TO"],
			checkDigits: "13",
		},
	],
	[
		"73091462200",
		{
			base: "73091462",
			fiscalRegion: "2",
			states: ["AC", "AP", "AM", "PA", "RO", "RR"],
			checkDigits: "00",
		},
	],
	[
		"20581746317",
		{ base: "20581746", fiscalRegion: "3", states: ["CE", "MA", "PI"], checkDigits: "17" },
	],
	[
		"91827364483",
		{ base: "91827364", fiscalRegion: "4", states: ["AL", "PB", "PE", "RN"], checkDigits: "83" },
	],
	["56473829598", { base: "56473829", fiscalRegion: "5", states: ["BA", "SE"], checkDigits: "98" }],
	["37192048631", { base: "37192048", fiscalRegion: "6", states: ["MG"], checkDigits: "31" }],
	["84620513717", { base: "84620513", fiscalRegion: "7", states: ["ES", "RJ"], checkDigits: "17" }],
	["15937264819", { base: "15937264", fiscalRegion: "8", states: ["SP"], checkDigits: "19" }],
	["60248175920", { base: "60248175", fiscalRegion: "9", states: ["PR", "SC"], checkDigits: "20" }],
	["48301692065", { base: "48301692", fiscalRegion: "0", states: ["RS"], checkDigits: "65" }],
];

describe("getCpfInfo", () => {
	describe("should return the fields of the CPF", () => {
		for (const [cpf, expected] of REGIONS) {
			test(`for ${cpf}, of the região fiscal ${expected.fiscalRegion}`, () => {
				expect(getCpfInfo(cpf)).toEqual(expected);
			});
		}

		test("for the worked example of the e-Financeira manual (280012389-38)", () => {
			expect(getCpfInfo("280012389-38")).toEqual({
				base: "28001238",
				fiscalRegion: "9",
				states: ["PR", "SC"],
				checkDigits: "38",
			});
		});

		test("for a masked value", () => {
			expect(getCpfInfo("123.456.789-09")).toEqual({
				base: "12345678",
				fiscalRegion: "9",
				states: ["PR", "SC"],
				checkDigits: "09",
			});
		});

		test("for a value with whitespace around and between the groups", () => {
			expect(getCpfInfo(" 111 444 777 35\n")).toEqual({
				base: "11144477",
				fiscalRegion: "7",
				states: ["ES", "RJ"],
				checkDigits: "35",
			});
		});

		test("with a states list of its own on every call", () => {
			const first = getCpfInfo("12345678909");

			first?.states.push("SP");

			expect(getCpfInfo("12345678909")?.states).toEqual(["PR", "SC"]);
		});
	});

	describe("should return null", () => {
		test("when the check digits do not match", () => {
			expect(getCpfInfo("12345678900")).toBeNull();
		});

		test("when every digit is the same", () => {
			expect(getCpfInfo("00000000000")).toBeNull();
			expect(getCpfInfo("111.111.111-11")).toBeNull();
		});

		test("when it is shorter than 11 digits", () => {
			expect(getCpfInfo("1234567890")).toBeNull();
		});

		test("when it is longer than 11 digits", () => {
			expect(getCpfInfo("123456789090")).toBeNull();
		});

		test("when it carries a character outside the mask", () => {
			expect(getCpfInfo("123.456.789-09a")).toBeNull();
			expect(getCpfInfo("123_456_789_09")).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getCpfInfo("")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getCpfInfo(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getCpfInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getCpfInfo(12_345_678_909)).toBeNull();
		});

		test("when it is an object, a null prototype one included", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getCpfInfo({})).toBeNull();
			expect(getCpfInfo(Object.create(null))).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getCpfInfo(["12345678909"])).toBeNull();
		});

		test("when it is a key of the prototype chain", () => {
			expect(getCpfInfo("__proto__")).toBeNull();
			expect(getCpfInfo("constructor")).toBeNull();
		});
	});

	describe("properties", () => {
		test("should split a CPF into fields that spell it back, masked or not", () => {
			fc.assert(
				fc.property(fc.boolean(), (masked) => {
					const cpf = generateCpf();
					const parsed = getCpfInfo(masked ? formatCpf(cpf) : cpf);

					expect(`${parsed?.base}${parsed?.fiscalRegion}${parsed?.checkDigits}`).toBe(cpf);
				}),
			);
		});

		test("should list the state a CPF was generated for", () => {
			fc.assert(
				fc.property(stateCodes, (state) => {
					expect(getCpfInfo(generateCpf(state))?.states).toContain(state);
				}),
			);
		});

		test("should return a value exactly when the CPF is valid", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					expect(getCpfInfo(value) !== null).toBe(isValidCpf(value));
				}),
			);
		});

		test("should never throw", () => {
			expectNeverThrows(getCpfInfo, anyValue);
			expectNeverThrows(getCpfInfo, anyGarbage);
		});
	});
});

describe("getCpfInfo types", () => {
	test("should take a string and return a CpfInfo or null", () => {
		expectTypeOf(getCpfInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getCpfInfo).returns.toEqualTypeOf<CpfInfo | null>();
		expectTypeOf<CpfInfo>().toEqualTypeOf<{
			base: string;
			fiscalRegion: string;
			states: StateCode[];
			checkDigits: string;
		}>();
	});
});
