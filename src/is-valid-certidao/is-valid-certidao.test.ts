import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCertidao } from "./is-valid-certidao";

describe("isValidCertidao", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCertidao(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCertidao()).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCertidao([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCertidao("")).toBe(false);
		});

		test("when it does not have 32 digits", () => {
			expect(isValidCertidao("104539015520131000120210000123")).toBe(false);
			expect(isValidCertidao("104539015520131000120210000123210")).toBe(false);
		});

		test("when it has 32 digits but an unsupported separator", () => {
			expect(isValidCertidao("104539#01#55#2013#1#00012#021#0000123#21")).toBe(false);
		});

		test("when it has 32 digits grouped outside the 6-2-2-4-1-5-3-7-2 mask", () => {
			expect(isValidCertidao("1045.3901.5520.1310.0012.0210.0001.2321")).toBe(false);
		});

		test("when it contains letters", () => {
			expect(isValidCertidao("A04539 01 55 2013 1 00012 021 0000123 21")).toBe(false);
		});

		test("when the check digits do not match (the ghiorzi.org example with 22)", () => {
			expect(isValidCertidao("10453901552013100012021000012322")).toBe(false);
		});

		test("when only the second check digit is wrong (the ghiorzi.org example with 20)", () => {
			expect(isValidCertidao("10453901552013100012021000012320")).toBe(false);
		});

		test("when the check digits are 99 (klawdyo/validation-br certidao.spec.ts invalid case)", () => {
			expect(isValidCertidao("12345601552023100001001000000199")).toBe(false);
		});

		test("when it is a number, which cannot carry the 32 significant digits of a matrícula", () => {
			expect(isValidCertidao(1_045_390_155)).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for 104539.01.55.2013.1.00012.021.0000123-21, the worked example of ghiorzi.org/DVnew.htm", () => {
			expect(isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21")).toBe(true);
			expect(isValidCertidao("10453901552013100012021000012321")).toBe(true);
		});

		test("for 131128 01 55 2010 1 00014 192 0006001 00 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("131128 01 55 2010 1 00014 192 0006001 00")).toBe(true);
		});

		test("for 094003 01 55 2011 1 00110 002 0051917 43 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("094003 01 55 2011 1 00110 002 0051917 43")).toBe(true);
		});

		test("for 094003 01 55 2010 1 00109 151 0051816 26 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("094003 01 55 2010 1 00109 151 0051816 26")).toBe(true);
		});

		test("for 094300 01 55 2010 1 00020 112 0000120-87 with a dash before the check digits (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("094300 01 55 2010 1 00020 112 0000120-87")).toBe(true);
		});

		test("for 094946 01 55 2011 1 00241 196 0099147 54 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("094946 01 55 2011 1 00241 196 0099147 54")).toBe(true);
		});

		test("for 001234 01 55 2026 1 00567 078 0099999 92 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(isValidCertidao("001234 01 55 2026 1 00567 078 0099999 92")).toBe(true);
		});

		test("for a matrícula whose first modulus 11 remainder is 10 and is read as 1", () => {
			expect(isValidCertidao("82668301552015209245842999011418")).toBe(true);
		});

		test("for a matrícula whose second modulus 11 remainder is 10 and is read as 1", () => {
			expect(isValidCertidao("79975401552015772710866666109571")).toBe(true);
		});

		test("for the dotted mask of the Provimento", () => {
			expect(isValidCertidao("104539.01.55.2013.1.00012.021.0000123-21")).toBe(true);
		});

		test("for the ghiorzi.org example with leading and trailing whitespace", () => {
			expect(isValidCertidao(" 104539 01 55 2013 1 00012 021 0000123 21 ")).toBe(true);
		});
	});

	describe("options.accept", () => {
		test("should return true when the book type is in the accepted list", () => {
			expect(
				isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["birth"] }),
			).toBe(true);
		});

		test("should return true when the book type is one of several accepted types", () => {
			expect(
				isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", {
					accept: ["death", "birth"],
				}),
			).toBe(true);
		});

		test("should return false when the book type is not in the accepted list", () => {
			expect(
				isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["death"] }),
			).toBe(false);
		});

		test("should return false when the accepted list is empty", () => {
			expect(isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: [] })).toBe(
				false,
			);
		});

		test("should return true for an interdiction act (book code 9) when accepted", () => {
			expect(
				isValidCertidao("10453901552013900012021000012398", { accept: ["interdiction"] }),
			).toBe(true);
		});

		test("should return true when the check digits match and accept is not given, book code 0", () => {
			expect(isValidCertidao("10453901552013000012021000012387")).toBe(true);
		});

		test("should return false when the book code is 0, outside the nine books of the Provimento, and accept is given", () => {
			expect(isValidCertidao("10453901552013000012021000012387", { accept: ["birth"] })).toBe(
				false,
			);
		});

		test("should return false when the matrícula itself is invalid, regardless of accept", () => {
			expect(isValidCertidao("123456", { accept: ["birth"] })).toBe(false);
		});

		test("should return false for book code 0 even if accept improperly lists undefined", () => {
			expect(
				isValidCertidao("10453901552013000012021000012387", {
					// @ts-expect-error not a real CertidaoType
					accept: [undefined],
				}),
			).toBe(false);
		});
	});
});
