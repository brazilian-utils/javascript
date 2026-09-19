import * as fc from "fast-check";

import { anyText, anyValue } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatCnpj } from "../format-cnpj/format-cnpj";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import {
	type CnpjFormat,
	type CnpjInfo,
	getCnpjInfo,
	type GetCnpjInfoOptions,
} from "./get-cnpj-info";

describe("getCnpjInfo", () => {
	describe("should return the parsed numeric CNPJ", () => {
		test("for a headquarters order", () => {
			expect(getCnpjInfo("12345678000195")).toEqual({
				root: "12345678",
				order: "0001",
				checkDigits: "95",
				format: "numeric",
				isInitialHeadquarters: true,
			});
		});

		test("for a branch order", () => {
			expect(getCnpjInfo("12345678000276")).toEqual({
				root: "12345678",
				order: "0002",
				checkDigits: "76",
				format: "numeric",
				isInitialHeadquarters: false,
			});
		});

		test("for a root with leading zeros", () => {
			expect(getCnpjInfo("00000001000136")).toEqual({
				root: "00000001",
				order: "0001",
				checkDigits: "36",
				format: "numeric",
				isInitialHeadquarters: true,
			});
		});

		test("for a masked value", () => {
			expect(getCnpjInfo("12.345.678/0001-95")).toEqual({
				root: "12345678",
				order: "0001",
				checkDigits: "95",
				format: "numeric",
				isInitialHeadquarters: true,
			});
		});

		test("for a value with a whitespace mask and surrounding whitespace", () => {
			expect(getCnpjInfo("  12 345 678 0002 76  ")).toEqual({
				root: "12345678",
				order: "0002",
				checkDigits: "76",
				format: "numeric",
				isInitialHeadquarters: false,
			});
		});

		test("under version 2, which reads both formats", () => {
			expect(getCnpjInfo("12.345.678/0001-95", { version: 2 })).toEqual({
				root: "12345678",
				order: "0001",
				checkDigits: "95",
				format: "numeric",
				isInitialHeadquarters: true,
			});
		});

		test("under an unknown version, read as version 1", () => {
			// @ts-expect-error: intentionally invalid option
			expect(getCnpjInfo("12345678000195", { version: 3 })).toEqual({
				root: "12345678",
				order: "0001",
				checkDigits: "95",
				format: "numeric",
				isInitialHeadquarters: true,
			});
		});
	});

	describe("should return the parsed alphanumeric CNPJ under version 2", () => {
		test("for the example of the Receita Federal check digit manual", () => {
			expect(getCnpjInfo("12.ABC.345/01DE-35", { version: 2 })).toEqual({
				root: "12ABC345",
				order: "01DE",
				checkDigits: "35",
				format: "alphanumeric",
				isInitialHeadquarters: false,
			});
		});

		test("for a lowercase value, upper casing the fields", () => {
			expect(getCnpjInfo("12abc34501de35", { version: 2 })).toEqual({
				root: "12ABC345",
				order: "01DE",
				checkDigits: "35",
				format: "alphanumeric",
				isInitialHeadquarters: false,
			});
		});

		test("for an alphanumeric root with the headquarters order", () => {
			expect(getCnpjInfo("AB.12C.D34/0001-84", { version: 2 })).toEqual({
				root: "AB12CD34",
				order: "0001",
				checkDigits: "84",
				format: "alphanumeric",
				isInitialHeadquarters: true,
			});
		});

		test("for an alphanumeric root and order (Receita Federal Q&A, question 23)", () => {
			expect(getCnpjInfo("AA345678/000A-29", { version: 2 })).toEqual({
				root: "AA345678",
				order: "000A",
				checkDigits: "29",
				format: "alphanumeric",
				isInitialHeadquarters: false,
			});
		});

		test("for a numeric root with an alphanumeric order (Receita Federal Q&A, question 23)", () => {
			expect(getCnpjInfo("12.345.678/000A-08", { version: 2 })).toEqual({
				root: "12345678",
				order: "000A",
				checkDigits: "08",
				format: "alphanumeric",
				isInitialHeadquarters: false,
			});
		});
	});

	describe("should return null", () => {
		test("when an alphanumeric CNPJ is read under the default version", () => {
			expect(getCnpjInfo("12.ABC.345/01DE-35")).toBeNull();
			expect(getCnpjInfo("12.ABC.345/01DE-35", {})).toBeNull();
			expect(getCnpjInfo("12.ABC.345/01DE-35", { version: 1 })).toBeNull();
		});

		test("when the check digits do not match", () => {
			expect(getCnpjInfo("12345678000190")).toBeNull();
			expect(getCnpjInfo("12ABC34501DE34", { version: 2 })).toBeNull();
		});

		test("when a check digit is a letter", () => {
			expect(getCnpjInfo("12ABC34501DE3A", { version: 2 })).toBeNull();
		});

		test("when it is a reserved repeated digits number", () => {
			expect(getCnpjInfo("00000000000000")).toBeNull();
			expect(getCnpjInfo("11111111111111", { version: 2 })).toBeNull();
		});

		test("when it is shorter or longer than 14 characters", () => {
			expect(getCnpjInfo("1234567800019")).toBeNull();
			expect(getCnpjInfo("123456780001955")).toBeNull();
		});

		test("when it carries a character outside the mask", () => {
			expect(getCnpjInfo("12.345.678/0001-95x")).toBeNull();
			expect(getCnpjInfo("12_345_678_0001_95")).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getCnpjInfo("")).toBeNull();
		});

		test("when it is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getCnpjInfo(null)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getCnpjInfo()).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getCnpjInfo(12_345_678_000_195)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getCnpjInfo({})).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getCnpjInfo(["12345678000195"])).toBeNull();
		});

		test("when the options are null", () => {
			// @ts-expect-error: intentionally invalid options
			expect(getCnpjInfo("12.ABC.345/01DE-35", null)).toBeNull();
		});
	});

	describe("properties", () => {
		const version = fc.constantFrom(1 as const, 2 as const);

		test("should split a generated CNPJ into fields that spell it back, masked or not", () => {
			fc.assert(
				fc.property(version, fc.boolean(), (currentVersion, masked) => {
					const cnpj = generateCnpj(currentVersion);
					const written = masked ? formatCnpj(cnpj, { version: 2 }) : cnpj;
					const parsed = getCnpjInfo(written.toLowerCase(), { version: 2 });

					expect(`${parsed?.root}${parsed?.order}${parsed?.checkDigits}`).toBe(cnpj);
					expect(parsed?.format).toBe(/[A-Z]/.test(cnpj) ? "alphanumeric" : "numeric");
				}),
			);
		});

		test("should flag the order 0001 of a generated CNPJ and no other", () => {
			fc.assert(
				fc.property(version, fc.integer({ min: 1, max: 9999 }), (currentVersion, branch) => {
					const cnpj = generateCnpj({ version: currentVersion, branch });
					const parsed = getCnpjInfo(cnpj, { version: currentVersion });

					expect(parsed?.order).toBe(String(branch).padStart(4, "0"));
					expect(parsed?.isInitialHeadquarters).toBe(branch === 1);
				}),
			);
		});

		test("should return a value exactly when the CNPJ is valid", () => {
			fc.assert(
				fc.property(fc.oneof(anyText, anyValue), version, (value, currentVersion) => {
					const options = { version: currentVersion };

					expect(getCnpjInfo(value as string, options) !== null).toBe(
						isValidCnpj(value as string, options),
					);
				}),
			);
		});

		test("should never throw and always return a CNPJ or null", () => {
			fc.assert(
				fc.property(anyValue, fc.anything(), (value, options) => {
					const parsed = getCnpjInfo(value as string, options as GetCnpjInfoOptions);

					expect(parsed === null || parsed.root.length === 8).toBe(true);
				}),
			);
		});
	});
});

describe("getCnpjInfo types", () => {
	test("should take a string and options and return a CnpjInfo or null", () => {
		expectTypeOf(getCnpjInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getCnpjInfo).parameter(1).toEqualTypeOf<GetCnpjInfoOptions | undefined>();
		expectTypeOf(getCnpjInfo).returns.toEqualTypeOf<CnpjInfo | null>();
		expectTypeOf<GetCnpjInfoOptions>().toEqualTypeOf<{ version?: 1 | 2 }>();
		expectTypeOf<CnpjFormat>().toEqualTypeOf<"numeric" | "alphanumeric">();
		expectTypeOf<CnpjInfo>().toEqualTypeOf<{
			root: string;
			order: string;
			checkDigits: string;
			format: CnpjFormat;
			isInitialHeadquarters: boolean;
		}>();
	});
});
