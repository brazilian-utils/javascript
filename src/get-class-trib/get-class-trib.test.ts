import * as fc from "fast-check";

import { CLASS_TRIB_CODES, CLASS_TRIB_TABLE } from "../_internals/constants/ibs-cbs";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getCstIbsCbs } from "../get-cst-ibs-cbs/get-cst-ibs-cbs";
import { isValidClassTrib } from "../is-valid-class-trib/is-valid-class-trib";
import { getClassTrib, type ClassTrib } from "./get-class-trib";

describe("getClassTrib", () => {
	it("should return the entry of a known code, with its CST, its name and its description", () => {
		expect(getClassTrib("000002")).toEqual({
			code: "000002",
			cst: "000",
			name: "Exploração de via",
			description: "Exploração de via, observado o art. 11 da Lei Complementar nº 214, de 2025.",
		});
		expect(getClassTrib("410999")).toEqual({
			code: "410999",
			cst: "410",
			name: "Operações não onerosas sem previsão de tributação, não especificadas anteriormente",
			description:
				"Operações não onerosas sem previsão de tributação, não especificadas anteriormente, observado o art. 4º da Lei Complementar nº 214, de 2025.",
		});
	});

	it("should return the entry of a code given as a number", () => {
		expect(getClassTrib(811_001)).toEqual({
			code: "811001",
			cst: "811",
			name: "Anulação de Crédito por Saídas Imunes/Isentas",
			description:
				"Anulação de crédito proporcional ao valor das operações imunes e isentas, observado o art. 51 da Lei Complementar nº 214, de 2025.",
		});
	});

	it("should pad a value with leading zeros, as a number or as a string", () => {
		const expected = {
			code: "000001",
			cst: "000",
			name: "Situações tributadas integralmente pelo IBS e CBS.",
			description: "Situações tributadas integralmente pelo IBS e CBS.",
		};

		expect(getClassTrib(1)).toEqual(expected);
		expect(getClassTrib("1")).toEqual(expected);
		expect(getClassTrib(" 000001 ")).toEqual(expected);
		expect(getClassTrib(10_002)?.cst).toBe("010");
	});

	it("should carry a code Informe Técnico 2025.002 v.1.60 created (620007)", () => {
		expect(getClassTrib("620007")).toEqual({
			code: "620007",
			cst: "620",
			name: "Perecimento, deteriorização, roubo, furto ou extravio no regime monofásico",
			description:
				"Perecimento, deteriorização, roubo, furto ou extravio no regime monofásico sem estorno de crédito, observado o art. 47 da Lei Complementar nº 214, de 2025.",
		});
	});

	it("should keep the workbook text on one line, without the line breaks of its cells", () => {
		expect(getClassTrib("830001")?.name).toBe(
			"Documento com exclusão da BC da CBS e do IBS de energia elétrica fornecida pela distribuidora à UC",
		);
	});

	it("should return a fresh object on every call", () => {
		expect(getClassTrib("200001")).not.toBe(getClassTrib("200001"));
	});

	it("should return null for the classifications of CST 220 Informe Técnico 2025.002 v.1.60 excluded", () => {
		expect(getClassTrib("220001")).toBeNull();
		expect(getClassTrib("220002")).toBeNull();
		expect(getClassTrib("220003")).toBeNull();
	});

	it("should return null for a code the table does not carry", () => {
		expect(getClassTrib("999999")).toBeNull();
		expect(getClassTrib("000000")).toBeNull();
		expect(getClassTrib("2000010")).toBeNull();
		expect(getClassTrib("200")).toBeNull();
	});

	it("should return null for a string that is not bare digits", () => {
		expect(getClassTrib("c200001")).toBeNull();
		expect(getClassTrib("200.001")).toBeNull();
		expect(getClassTrib("")).toBeNull();
		expect(getClassTrib("__proto__")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getClassTrib(-200_001)).toBeNull();
		expect(getClassTrib(200_001.5)).toBeNull();
		expect(getClassTrib(2 ** 53)).toBeNull();
	});

	it("should return null for a value that is not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(getClassTrib(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getClassTrib()).toBeNull();
		expect(getClassTrib(Object.create(null))).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getClassTrib, anyGarbage);
		});

		test("should resolve every code isValidClassTrib knows, under a CST getCstIbsCbs knows", () => {
			fc.assert(
				fc.property(fc.constantFrom(...CLASS_TRIB_CODES), (code) => {
					const entry = getClassTrib(code);

					expect(entry?.code).toBe(code);
					expect(getCstIbsCbs(entry?.cst ?? "")).not.toBeNull();
					expect(isValidClassTrib(code, { cst: entry?.cst })).toBe(true);
				}),
			);
		});

		test("should describe exactly the codes isValidClassTrib accepts", () => {
			expect(Object.keys(CLASS_TRIB_TABLE).sort()).toEqual([...CLASS_TRIB_CODES]);
		});

		test("should resolve a value exactly when isValidClassTrib accepts it", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 999_999 }), (value) => {
					expect(getClassTrib(value) !== null).toBe(isValidClassTrib(value));
				}),
			);
		});
	});
});

describe("getClassTrib types", () => {
	test("should take a string or number and return a ClassTrib or null", () => {
		expectTypeOf(getClassTrib).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getClassTrib).returns.toEqualTypeOf<ClassTrib | null>();
		expectTypeOf<ClassTrib>().toEqualTypeOf<{
			code: string;
			cst: string;
			name: string;
			description: string;
		}>();
	});
});
