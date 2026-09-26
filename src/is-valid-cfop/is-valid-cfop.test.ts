import * as fc from "fast-check";

import { CFOP_CODES } from "../_internals/constants/cfop";
import { CFOP_DESCRIPTIONS } from "../_internals/constants/cfop-descriptions";
import { anyGarbage } from "../_internals/test/arbitraries";
import { lookupTable } from "../_internals/test/lookup-table";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCfop } from "./is-valid-cfop";

const CFOP_TABLE = lookupTable(CFOP_CODES, 4, CFOP_DESCRIPTIONS);

describe("isValidCfop", () => {
	it("should return true for a known CFOP code as a string", () => {
		expect(isValidCfop("5102")).toBe(true);
	});

	it("should return true for a known CFOP code as a number", () => {
		expect(isValidCfop(5102)).toBe(true);
	});

	it("should return true for a masked CFOP code (5.102)", () => {
		expect(isValidCfop("5.102")).toBe(true);
	});

	it("should return true for a code with surrounding whitespace", () => {
		expect(isValidCfop(" 5102 ")).toBe(true);
	});

	it("should validate the sale of goods acquired from third parties (CFOP 5102)", () => {
		expect(isValidCfop("5102")).toBe(true);
	});

	it("should accept the codes the 2022 and 2024 rewrites of the annex added (7504, 6360, 2128 and 1934)", () => {
		expect(isValidCfop("7504")).toBe(true);
		expect(isValidCfop("6360")).toBe(true);
		expect(isValidCfop("2128")).toBe(true);
		expect(isValidCfop("1934")).toBe(true);
	});

	it("should accept the ato cooperativo and Sistema de Integração e Parceria Rural series (1131 and 1453)", () => {
		expect(isValidCfop("1131")).toBe(true);
		expect(isValidCfop("1453")).toBe(true);
	});

	it("should accept a code whose body the annex glues into the code line (1255)", () => {
		expect(isValidCfop("1255")).toBe(true);
	});

	it("should return false for an unknown 4 digit code", () => {
		expect(isValidCfop("0000")).toBe(false);
	});

	it("should return false for a group heading (a code ending in 00)", () => {
		expect(isValidCfop("1100")).toBe(false);
		expect(isValidCfop("5300")).toBe(false);
	});

	it("should return false for a subgroup heading (a code ending in 50)", () => {
		expect(isValidCfop("1150")).toBe(false);
		expect(isValidCfop("5350")).toBe(false);
	});

	it("should still accept the operable codes a subgroup heading heads (1151 and 5351)", () => {
		expect(isValidCfop("1151")).toBe(true);
		expect(isValidCfop("5351")).toBe(true);
	});

	it("should return false for a code with a length different from 4", () => {
		expect(isValidCfop("510")).toBe(false);
		expect(isValidCfop("51020")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCfop("")).toBe(false);
	});

	it("should return false for null", () => {
		// @ts-expect-error not a string or number
		expect(isValidCfop(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCfop()).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCfop("abcd")).toBe(false);
	});

	it("should return false for a string that is not a documented form", () => {
		expect(isValidCfop("abc5102")).toBe(false);
		expect(isValidCfop("5..102")).toBe(false);
	});

	it("should return false for a number that is not a non-negative safe integer", () => {
		expect(isValidCfop(-5102)).toBe(false);
		expect(isValidCfop(51.02)).toBe(false);
		expect(isValidCfop(2 ** 53)).toBe(false);
	});

	it("should return false for a null-prototype object", () => {
		expect(isValidCfop(Object.create(null))).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CFOP_TABLE));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCfop, anyGarbage);
		});

		test("should validate every known code, as a string or a number", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(isValidCfop(code)).toBe(true);
					expect(isValidCfop(Number(code))).toBe(true);
				}),
			);
		});
	});
});

describe("isValidCfop types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCfop).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCfop).returns.toEqualTypeOf<boolean>();
	});
});
