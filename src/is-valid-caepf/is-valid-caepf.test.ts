import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCaepf } from "./is-valid-caepf";

const CHECK_DIGIT_PAIRS = Array.from({ length: 100 }, (_, pair) => String(pair).padStart(2, "0"));

const findCaepf = (base: string): string =>
	CHECK_DIGIT_PAIRS.map((pair) => `${base}${pair}`).find((value) => isValidCaepf(value)) ?? "";

describe("isValidCaepf", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCaepf(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCaepf()).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCaepf([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCaepf("")).toBe(false);
		});

		test("when it does not have 14 digits", () => {
			expect(isValidCaepf("1234567890")).toBe(false);
			expect(isValidCaepf("293118610001840")).toBe(false);
		});

		test("when it contains letters", () => {
			expect(isValidCaepf("abc.118.610/001-84")).toBe(false);
		});

		test("when it has 14 digits but an unsupported separator", () => {
			expect(isValidCaepf("293#118#610#001#84")).toBe(false);
		});

		test("when every digit is the same", () => {
			expect(isValidCaepf("00000000000000")).toBe(false);
			expect(isValidCaepf("11111111111111")).toBe(false);
		});

		test("when the check digits do not match (29311861000185, Casilhero/brazilian-validators CaepfTest)", () => {
			expect(isValidCaepf("29311861000185")).toBe(false);
		});

		test("when the check digits are zeroed (293.118.610/001-00, Casilhero/brazilian-validators CaepfTest)", () => {
			expect(isValidCaepf("29311861000100")).toBe(false);
			expect(isValidCaepf("293.118.610/001-00")).toBe(false);
		});

		test("when the shift of 12 is not applied (29311861000172 instead of 29311861000184)", () => {
			expect(isValidCaepf("29311861000172")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for 293.118.610/001-84 (Casilhero/brazilian-validators CaepfTest, from ghiorzi.org)", () => {
			expect(isValidCaepf("293.118.610/001-84")).toBe(true);
			expect(isValidCaepf("29311861000184")).toBe(true);
		});

		test("for 411.422.600/001-01 (VitorLuizC/brazilian-values isCAEPF doc example)", () => {
			expect(isValidCaepf("411.422.600/001-01")).toBe(true);
			expect(isValidCaepf("41142260000101")).toBe(true);
		});

		test("for 826.200.352/001-15, whose first modulus 11 remainder is 10", () => {
			expect(isValidCaepf("82620035200115")).toBe(true);
		});

		test("for 701.801.963/001-02, whose second modulus 11 remainder is 10", () => {
			expect(isValidCaepf("70180196300102")).toBe(true);
		});

		test("for a number input", () => {
			expect(isValidCaepf(29_311_861_000_184)).toBe(true);
		});

		test("for a whitespace mask and surrounding whitespace", () => {
			expect(isValidCaepf(" 293 118 610 001 84 ")).toBe(true);
		});
	});

	describe("properties", () => {
		const bases = fc.stringMatching(/^[0-9]{12}$/);

		test("should accept exactly one pair of check digits for any CPF base", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const accepted = CHECK_DIGIT_PAIRS.filter((pair) => isValidCaepf(`${base}${pair}`));

					expect(accepted.length).toBe(1);
				}),
			);
		});

		test("should read the same registration with and without the official mask", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const value = findCaepf(base);
					const cpf = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}`;
					const masked = `${cpf}/${value.slice(9, 12)}-${value.slice(12)}`;

					expect(isValidCaepf(masked)).toBe(true);
				}),
			);
		});

		test("should never throw and always judge a CAEPF number with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidCaepf(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidCaepf types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCaepf).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCaepf).returns.toEqualTypeOf<boolean>();
	});
});
