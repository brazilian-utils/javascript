import { describe, expect, test } from "../_internals/test/runtime";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { isValidPixKey } from "./is-valid-pix-key";

describe("isValidPixKey", () => {
	describe("should return false", () => {
		test("when it is an empty or blank string", () => {
			expect(isValidPixKey("")).toBe(false);
			expect(isValidPixKey("   ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey()).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey(12_345_678_909)).toBe(false);
		});

		test("when it is a boolean, an object or an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey({})).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey([])).toBe(false);
		});

		test("when it is not a key of any accepted kind", () => {
			expect(isValidPixKey("chave pix")).toBe(false);
			expect(isValidPixKey("11257245286")).toBe(false);
			expect(isValidPixKey("fulano@example")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for a CPF", () => {
			expect(isValidPixKey("123.456.789-09")).toBe(true);
			expect(isValidPixKey("40364478829")).toBe(true);
		});

		test("for a CNPJ", () => {
			expect(isValidPixKey("00.038.166/0001-05")).toBe(true);
			expect(isValidPixKey("12ABC34501DE35")).toBe(true);
		});

		test("for an e-mail", () => {
			expect(isValidPixKey("fulano_da_silva.recebedor@example.com")).toBe(true);
		});

		test("for a phone", () => {
			expect(isValidPixKey("+5561912345678")).toBe(true);
			expect(isValidPixKey("(11) 98765-4321")).toBe(true);
		});

		test("for a random key", () => {
			expect(isValidPixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d")).toBe(true);
			expect(isValidPixKey("123e4567-e12b-12d1-a456-426655440000")).toBe(true);
		});

		test("for randomized documents", () => {
			for (let index = 0; index < 200; index++) {
				expect(isValidPixKey(generateCpf())).toBe(true);
				expect(isValidPixKey(generateCnpj())).toBe(true);
			}
		});
	});

	describe("should honour options.accept", () => {
		test("accepting only the listed kinds", () => {
			expect(isValidPixKey("123.456.789-09", { accept: ["cpf"] })).toBe(true);
			expect(isValidPixKey("123.456.789-09", { accept: ["email", "evp"] })).toBe(false);
			expect(isValidPixKey("fulano@example.com", { accept: ["email", "evp"] })).toBe(true);
			expect(isValidPixKey("+5511987654321", { accept: ["phone"] })).toBe(true);
			expect(isValidPixKey("00038166000105", { accept: ["cnpj"] })).toBe(true);
		});

		test("accepting nothing for an empty list", () => {
			expect(isValidPixKey("123.456.789-09", { accept: [] })).toBe(false);
		});

		test("accepting every kind when the option is absent or not a list", () => {
			expect(isValidPixKey("123.456.789-09", {})).toBe(true);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey("123.456.789-09", { accept: "cpf" })).toBe(true);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixKey("123.456.789-09", null)).toBe(true);
		});
	});
});
