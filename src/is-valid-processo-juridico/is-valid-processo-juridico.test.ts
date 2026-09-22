import * as fc from "fast-check";

import {
	PROCESSO_JURIDICO_LENGTH,
	PROCESSO_JURIDICO_TRIBUNALS,
} from "../_internals/constants/processo-juridico";
import {
	anyValue,
	digitsOfOtherLength,
	maskSeparators,
	processosJuridicos,
} from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
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

		test("when a mask character leads or trails an otherwise valid value", () => {
			expect(isValidProcessoJuridico("-00020802520125150049")).toBe(false);
			expect(isValidProcessoJuridico("00020802520125150049.")).toBe(false);
			expect(isValidProcessoJuridico(".0002080-25.2012.5.15.0049-")).toBe(false);
		});

		test("when a letter is attached to the digits", () => {
			expect(isValidProcessoJuridico("ab00020802520125150049")).toBe(false);
			expect(isValidProcessoJuridico("00020802520125150049ab")).toBe(false);
		});

		test("when the mask uses a character the CNJ layout does not carry", () => {
			expect(isValidProcessoJuridico("0002080/25.2012.5.15.0049")).toBe(false);
		});

		test("when a mask separator falls outside the CNJ field boundaries", () => {
			expect(isValidProcessoJuridico("000208-0252012.5.15.0049")).toBe(false);
		});

		test("when the órgão (J) is not one of the nine segments of art. 1º, § 4º", () => {
			expect(isValidProcessoJuridico("0000100-69.2008.0.00.0000")).toBe(false);
		});

		test("when the Justiça Federal carries a region beyond the sixth (art. 1º, § 5º, III)", () => {
			expect(isValidProcessoJuridico("0000100-41.2008.4.07.0000")).toBe(false);
		});

		test("when the Justiça Estadual carries a tribunal beyond the twenty seventh (art. 1º, § 5º, VII)", () => {
			expect(isValidProcessoJuridico("0000100-23.2008.8.28.0000")).toBe(false);
		});

		test("when the Justiça Estadual zeroes the tribunal, which has no superior court of its own", () => {
			expect(isValidProcessoJuridico("0000100-03.2008.8.00.0000")).toBe(false);
		});

		test("when the Justiça Militar Estadual names a state without a military court (art. 1º, § 5º, VIII)", () => {
			expect(isValidProcessoJuridico("0000100-89.2008.9.01.0000")).toBe(false);
		});

		test("when a superior court carries a tribunal instead of the zeroed field (art. 1º, § 5º, I)", () => {
			expect(isValidProcessoJuridico("0000100-58.2008.1.01.0000")).toBe(false);
		});

		test("when a segment without a council carries the council code (art. 1º, § 5º, II)", () => {
			expect(isValidProcessoJuridico("0000100-14.2008.9.90.0000")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a processo juridico valid without mask", () => {
			expect(isValidProcessoJuridico("00020802520125150049")).toBe(true);
		});

		test("when is a processo juridico valid with the CNJ mask", () => {
			expect(isValidProcessoJuridico("0002080-25.2012.5.15.0049")).toBe(true);
		});

		test("when a masked processo juridico is surrounded by whitespace", () => {
			expect(isValidProcessoJuridico(" 0002080-25.2012.5.15.0049 ")).toBe(true);
			expect(isValidProcessoJuridico("\n00020802520125150049\t")).toBe(true);
		});

		test("when is a processo juridico valid with the legacy fused mask", () => {
			expect(isValidProcessoJuridico("0002080-25.2012.515.0049")).toBe(true);
		});

		test("when the órgão is the Supremo Tribunal Federal (art. 1º, § 4º, I)", () => {
			expect(isValidProcessoJuridico("0000100-85.2008.1.00.0000")).toBe(true);
		});

		test("when the órgão is the Conselho Nacional de Justiça (art. 1º, § 4º, II)", () => {
			expect(isValidProcessoJuridico("0000100-04.2008.2.00.0000")).toBe(true);
		});

		test("when the órgão is the Superior Tribunal de Justiça (art. 1º, § 4º, III)", () => {
			expect(isValidProcessoJuridico("0000100-20.2008.3.00.0000")).toBe(true);
		});

		test("when the órgão is the Justiça Federal and the tribunal a TRF (art. 1º, § 5º, III)", () => {
			expect(isValidProcessoJuridico("0000100-09.2008.4.01.0000")).toBe(true);
		});

		test("when the órgão is the Justiça do Trabalho and the tribunal a TRT (art. 1º, § 5º, IV)", () => {
			expect(isValidProcessoJuridico("0000100-35.2008.5.15.0000")).toBe(true);
		});

		test("when the órgão is the Justiça Eleitoral and the tribunal a TRE (art. 1º, § 5º, V)", () => {
			expect(isValidProcessoJuridico("0000100-18.2008.6.27.0000")).toBe(true);
		});

		test("when the órgão is the Justiça Militar da União and the tribunal a CJM (art. 1º, § 5º, VI)", () => {
			expect(isValidProcessoJuridico("0000100-51.2008.7.12.0000")).toBe(true);
		});

		test("when the órgão is the Justiça Estadual and the tribunal a TJ (art. 1º, § 5º, VII)", () => {
			expect(isValidProcessoJuridico("0000100-73.2008.8.01.0000")).toBe(true);
		});

		test("when the órgão is the Justiça Militar Estadual and the tribunal a TJM (art. 1º, § 5º, VIII)", () => {
			expect(isValidProcessoJuridico("0000100-56.2008.9.13.0000")).toBe(true);
			expect(isValidProcessoJuridico("0000100-34.2008.9.21.0000")).toBe(true);
			expect(isValidProcessoJuridico("0000100-93.2008.9.26.0000")).toBe(true);
		});

		test("when the Justiça Federal names the TRF da 6ª Região, added by Resolução CNJ nº 477/2022", () => {
			expect(isValidProcessoJuridico("0000100-68.2008.4.06.0000")).toBe(true);
		});

		test("when the number originates in the CJF or in the CSJT, whose tribunal is 90 (art. 1º, § 5º, II)", () => {
			expect(isValidProcessoJuridico("0000100-31.2008.4.90.0000")).toBe(true);
			expect(isValidProcessoJuridico("0000100-47.2008.5.90.0000")).toBe(true);
		});

		test("when the TST, the TSE or the STM zeroes the tribunal (art. 1º, § 5º, I)", () => {
			expect(isValidProcessoJuridico("0000100-52.2008.5.00.0000")).toBe(true);
			expect(isValidProcessoJuridico("0000100-68.2008.6.00.0000")).toBe(true);
			expect(isValidProcessoJuridico("0000100-84.2008.7.00.0000")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept a generated number whatever mask separates its fields", () => {
			fc.assert(
				fc.property(fc.gen(), maskSeparators([".", "-", " "], 5, 3), (g, separators) => {
					const value = g(processosJuridicos);
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

		test("should reject every tribunal the órgão of the value does not have", () => {
			const courts = [...PROCESSO_JURIDICO_TRIBUNALS.keys()];

			fc.assert(
				fc.property(
					fc.constantFrom(...courts),
					fc.integer({ min: 0, max: 99 }),
					(court, tribunal) => {
						fc.pre(!(PROCESSO_JURIDICO_TRIBUNALS.get(court) as number[]).includes(tribunal));

						const base = `00001002008${court}${String(tribunal).padStart(2, "0")}0000`;
						const checkDigits = (98n - ((BigInt(base) * 100n) % 97n)).toString().padStart(2, "0");

						expect(isValidProcessoJuridico(`0000100${checkDigits}${base.slice(7)}`)).toBe(false);
					},
				),
			);
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
