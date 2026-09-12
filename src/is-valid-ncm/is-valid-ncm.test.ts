import * as fc from "fast-check";

import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { NCM_CODES } from "./constants";
import { isValidNcm } from "./is-valid-ncm";

describe("isValidNcm", () => {
	it("should validate an NCM code without a mask (cerveja de malte)", () => {
		expect(isValidNcm("22030000")).toBe(true);
	});

	it("should validate an NCM code with the dotted mask", () => {
		expect(isValidNcm("2203.00.00")).toBe(true);
	});

	it("should validate an NCM code given as a number", () => {
		expect(isValidNcm(22_030_000)).toBe(true);
	});

	it("should validate a leading zero NCM code (cavalos reprodutores de raça pura)", () => {
		expect(isValidNcm("01012100")).toBe(true);
		expect(isValidNcm("0101.21.00")).toBe(true);
	});

	it("should return false for a number that lost a leading zero (1012100 is not 01012100)", () => {
		expect(isValidNcm(1_012_100)).toBe(false);
	});

	it("should validate an NCM code with surrounding whitespace", () => {
		expect(isValidNcm(" 22030000 ")).toBe(true);
	});

	it("should return false for an unknown 8 digit code", () => {
		expect(isValidNcm("12345678")).toBe(false);
	});

	it("should return false when the digit count is not eight", () => {
		expect(isValidNcm("2203000")).toBe(false);
		expect(isValidNcm("220300000")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidNcm("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidNcm(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidNcm()).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidNcm("        ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidNcm("abcdefgh")).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...NCM_CODES);
		const nonZeroLeadingCodeArbitrary = fc.constantFrom(
			...NCM_CODES.filter((code) => !code.startsWith("0")),
		);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidNcm, anyGarbage);
		});

		test("should validate every known code, with or without the NNNN.NN.NN mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`;

					expect(isValidNcm(code)).toBe(true);
					expect(isValidNcm(masked)).toBe(true);
				}),
			);
		});

		test("should validate every known code without a leading zero when given as a number", () => {
			fc.assert(
				fc.property(nonZeroLeadingCodeArbitrary, (code) => {
					expect(isValidNcm(Number(code))).toBe(true);
				}),
			);
		});
	});
});

describe("isValidNcm types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidNcm).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidNcm).returns.toEqualTypeOf<boolean>();
	});
});
