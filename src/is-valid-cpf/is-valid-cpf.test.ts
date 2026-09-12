import { CPF_LENGTH } from "../_internals/constants/cpf";
import { describe, expect, test } from "../_internals/test/runtime";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { RESERVED_NUMBERS } from "./constants";
import { isValidCpf } from "./is-valid-cpf";

describe("isValidCpf", () => {
	describe("should return false", () => {
		test("when it is on the RESERVED_NUMBERS", () => {
			for (const cpf of RESERVED_NUMBERS) {
				expect(isValidCpf(cpf)).toBe(false);
			}
		});

		test("when it is an empty string", () => {
			expect(isValidCpf("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidCpf(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidCpf(undefined)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidCpf(true)).toBe(false);
			// @ts-expect-error
			expect(isValidCpf(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error
			expect(isValidCpf({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error
			expect(isValidCpf([])).toBe(false);
		});

		test(`when it does not match the CPF length (${CPF_LENGTH})`, () => {
			expect(isValidCpf("123456")).toBe(false);
		});

		test("when contains only letters or special characters", () => {
			expect(isValidCpf("abcabcabcde")).toBe(false);
		});

		test("when is a CPF invalid", () => {
			expect(isValidCpf("11257245286")).toBe(false);
		});

		test("when is a CPF invalid test numbers with letters", () => {
			expect(isValidCpf("foo391.838.38test0-66")).toBe(false);
		});

		test("when there is garbage before the digits, since the format is anchored at the start", () => {
			expect(isValidCpf("!40364478829")).toBe(false);
		});

		test("when there is garbage after the digits, since the format is anchored at the end", () => {
			expect(isValidCpf("40364478829!")).toBe(false);
		});

		test("when only the first check digit is wrong, even though the second would then match", () => {
			expect(isValidCpf("40364478837")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a CPF valid without mask", () => {
			expect(isValidCpf("40364478829")).toBe(true);
		});

		test("when is a CPF valid with mask", () => {
			expect(isValidCpf("962.718.458-60")).toBe(true);
		});

		test("when is a CPF valid with a whitespace mask", () => {
			expect(isValidCpf("123 456 789 09")).toBe(true);
		});

		test("when is a CPF valid with leading/trailing whitespace", () => {
			expect(isValidCpf(" 12345678909")).toBe(true);
			expect(isValidCpf("12345678909 ")).toBe(true);
		});

		test("should return true for randomly generated CPFs", () => {
			for (let i = 0; i < 100; i++) {
				expect(isValidCpf(generateCpf())).toBe(true);
			}
		});
	});
});
