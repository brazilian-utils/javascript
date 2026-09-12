import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { describe, expect, test } from "../_internals/test/runtime";
import { isValidProcessoJuridico } from "./is-valid-processo-juridico";

describe("isValidProcessoJuridico", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidProcessoJuridico("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidProcessoJuridico(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidProcessoJuridico(undefined)).toBe(false);
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
});
