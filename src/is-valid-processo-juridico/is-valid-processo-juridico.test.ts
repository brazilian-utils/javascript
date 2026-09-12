import * as fc from "fast-check";

import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { anyValue, digitsOfOtherLength, maskSeparators } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateProcessoJuridico } from "../generate-processo-juridico/generate-processo-juridico";
import { isValidProcessoJuridico } from "./is-valid-processo-juridico";

describe("isValidProcessoJuridico", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidProcessoJuridico("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidProcessoJuridico(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidProcessoJuridico()).toBe(false);
		});

		test(`when length is less than ${PROCESSO_JURIDICO_LENGTH}`, () => {
			expect(isValidProcessoJuridico("123")).toBe(false);
		});

		test("when it sanitizes to more digits than the expected length, even if the check digit still matches", () => {
			expect(isValidProcessoJuridico("0002080252012515004999")).toBe(false);
		});

		test("when it is a 20 digit value with a mismatched check digit", () => {
			expect(isValidProcessoJuridico("00020802520125150050")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a processo juridico valid without mask", () => {
			expect(isValidProcessoJuridico("00020802520125150049")).toBe(true);
		});

		test("when is a processo juridico valid with the CNJ mask", () => {
			expect(isValidProcessoJuridico("0002080-25.2012.5.15.0049")).toBe(true);
		});

		test("when is a processo juridico valid with the legacy fused mask", () => {
			expect(isValidProcessoJuridico("0002080-25.2012.515.0049")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept a generated number whatever mask separates its fields", () => {
			fc.assert(
				fc.property(maskSeparators([".", "-", "/", " "], 5, 3), (separators) => {
					const value = generateProcessoJuridico() as string;
					const head = `${value.slice(0, 7)}${separators[0]}${value.slice(7, 9)}`;
					const body = `${separators[1]}${value.slice(9, 13)}${separators[2]}`;
					const court = `${value.slice(13, 14)}${separators[3]}${value.slice(14, 16)}`;
					const tail = `${separators[4]}${value.slice(16)}`;

					expect(isValidProcessoJuridico(`${head}${body}${court}${tail}`)).toBe(true);
				}),
			);
		});

		test(`should reject any digits only value that is not ${PROCESSO_JURIDICO_LENGTH} long`, () => {
			expectRejected(isValidProcessoJuridico, digitsOfOtherLength(30, [PROCESSO_JURIDICO_LENGTH]));
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidProcessoJuridico, "boolean", anyValue);
		});
	});
});

describe("isValidProcessoJuridico types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidProcessoJuridico).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidProcessoJuridico).returns.toEqualTypeOf<boolean>();
	});
});
