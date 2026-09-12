import { describe, expect, test } from "../_internals/test/runtime";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { generatePhone } from "../generate-phone/generate-phone";
import { parsePixKey } from "./parse-pix-key";

const AMBIGUOUS = "51998259765";

describe("parsePixKey", () => {
	describe("should return null", () => {
		test("when it is an empty or blank string", () => {
			expect(parsePixKey("")).toBeNull();
			expect(parsePixKey("   ")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(parsePixKey(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(parsePixKey(undefined)).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(parsePixKey(12345678909)).toBeNull();
		});

		test("when it is a boolean, an object or an array", () => {
			// @ts-expect-error
			expect(parsePixKey(true)).toBeNull();
			// @ts-expect-error
			expect(parsePixKey({})).toBeNull();
			// @ts-expect-error
			expect(parsePixKey([])).toBeNull();
		});

		test("when it is an invalid CPF", () => {
			expect(parsePixKey("11257245286")).toBeNull();
		});

		test("when it is an invalid CNPJ", () => {
			expect(parsePixKey("11222333000182")).toBeNull();
		});

		test("when it is an invalid e-mail", () => {
			expect(parsePixKey("fulano@")).toBeNull();
			expect(parsePixKey("@example.com")).toBeNull();
			expect(parsePixKey("fulano@example")).toBeNull();
		});

		test("when the e-mail is longer than 77 characters", () => {
			expect(parsePixKey(`${"a".repeat(66)}@example.com`)).toBeNull();
		});

		test("when the random key is not a UUID", () => {
			expect(parsePixKey("71c7d9be4b854e439f1c1f3b8b4e9a2d")).toBeNull();
			expect(parsePixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2")).toBeNull();
			expect(parsePixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9azz")).toBeNull();
		});

		test("when the phone has an invalid area code", () => {
			expect(parsePixKey("(00) 98765-4321")).toBeNull();
		});

		test("when it is free text", () => {
			expect(parsePixKey("chave pix")).toBeNull();
			expect(parsePixKey("---")).toBeNull();
		});
	});

	describe("should return a CPF", () => {
		test("when it is masked", () => {
			expect(parsePixKey("123.456.789-09")).toEqual({ type: "cpf", value: "12345678909" });
		});

		test("when it is unmasked", () => {
			expect(parsePixKey("40364478829")).toEqual({ type: "cpf", value: "40364478829" });
		});

		test("when surrounded by whitespace", () => {
			expect(parsePixKey("  40364478829  ")).toEqual({ type: "cpf", value: "40364478829" });
		});
	});

	describe("should return a CNPJ", () => {
		test("when it is masked", () => {
			expect(parsePixKey("00.038.166/0001-05")).toEqual({
				type: "cnpj",
				value: "00038166000105",
			});
		});

		test("when it is unmasked", () => {
			expect(parsePixKey("00038166000105")).toEqual({
				type: "cnpj",
				value: "00038166000105",
			});
		});

		test("when it is the alphanumeric format of the manual", () => {
			expect(parsePixKey("12ABC34501DE35")).toEqual({ type: "cnpj", value: "12ABC34501DE35" });
			expect(parsePixKey("12.abc.345/01de-35")).toEqual({
				type: "cnpj",
				value: "12ABC34501DE35",
			});
		});
	});

	describe("should resolve the CNPJ and phone ambiguity", () => {
		test("should read a valid CNPJ as a CNPJ even when it starts with 0055", () => {
			expect(parsePixKey("00551760871813")).toEqual({ type: "cnpj", value: "00551760871813" });
			expect(parsePixKey("00.551.760/8718-13")).toEqual({ type: "cnpj", value: "00551760871813" });
		});

		test("should still read a 0055 prefixed value that is not a valid CNPJ as a phone", () => {
			expect(parsePixKey("00551133334444")).toEqual({ type: "phone", value: "+551133334444" });
		});
	});

	describe("should return an e-mail", () => {
		test("when it is the example of the manual", () => {
			expect(parsePixKey("fulano_da_silva.recebedor@example.com")).toEqual({
				type: "email",
				value: "fulano_da_silva.recebedor@example.com",
			});
		});

		test("when it is uppercased or padded", () => {
			expect(parsePixKey("  Fulano@Example.COM ")).toEqual({
				type: "email",
				value: "fulano@example.com",
			});
		});

		test("when it is exactly 77 characters long", () => {
			const email = `${"a".repeat(65)}@example.com`;

			expect(email).toHaveLength(77);
			expect(parsePixKey(email)).toEqual({ type: "email", value: email });
		});
	});

	describe("should return a phone", () => {
		test("when it is the example of the manual", () => {
			expect(parsePixKey("+5561912345678")).toEqual({
				type: "phone",
				value: "+5561912345678",
			});
		});

		test("when it is masked", () => {
			expect(parsePixKey("(11) 98765-4321")).toEqual({
				type: "phone",
				value: "+5511987654321",
			});
		});

		test("when it is bare", () => {
			expect(parsePixKey("11987654321")).toEqual({ type: "phone", value: "+5511987654321" });
		});

		test("when it carries the country code in every accepted form", () => {
			expect(parsePixKey("+55 11 98765-4321")).toEqual({
				type: "phone",
				value: "+5511987654321",
			});
			expect(parsePixKey("005511987654321")).toEqual({
				type: "phone",
				value: "+5511987654321",
			});
			expect(parsePixKey("5511987654321")).toEqual({
				type: "phone",
				value: "+5511987654321",
			});
		});

		test("when it is a landline", () => {
			expect(parsePixKey("(11) 3000-0000")).toEqual({ type: "phone", value: "+551130000000" });
		});

		test("and never exceed the 14 characters of the E.164 form", () => {
			for (let index = 0; index < 200; index++) {
				const key = parsePixKey(`+55${generatePhone()}`);

				expect(key?.type).toBe("phone");
				expect(key?.value.length).toBeLessThanOrEqual(14);
			}
		});
	});

	describe("should return a random key", () => {
		test("when it is a lowercase UUID version 4", () => {
			expect(parsePixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d")).toEqual({
				type: "evp",
				value: "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d",
			});
		});

		test("when it is uppercased, lowercasing it", () => {
			expect(parsePixKey("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D")).toEqual({
				type: "evp",
				value: "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d",
			});
		});

		test("when it is the example of the manual, whose version nibble is not 4", () => {
			expect(parsePixKey("123e4567-e12b-12d1-a456-426655440000")).toEqual({
				type: "evp",
				value: "123e4567-e12b-12d1-a456-426655440000",
			});
		});
	});

	describe("should resolve the CPF and phone ambiguity", () => {
		test("preferring the CPF when the value is valid as both", () => {
			expect(parsePixKey(AMBIGUOUS)).toEqual({ type: "cpf", value: AMBIGUOUS });
		});

		test("preferring the phone when it starts with the country code", () => {
			expect(parsePixKey(`+55${AMBIGUOUS}`)).toEqual({
				type: "phone",
				value: `+55${AMBIGUOUS}`,
			});
			expect(parsePixKey(`0055${AMBIGUOUS}`)).toEqual({
				type: "phone",
				value: `+55${AMBIGUOUS}`,
			});
		});

		test("preferring the phone when the DDD is written between parentheses", () => {
			expect(parsePixKey("(51) 99825-9765")).toEqual({
				type: "phone",
				value: `+55${AMBIGUOUS}`,
			});
		});

		test("keeping the CPF when it is written with its own mask", () => {
			expect(parsePixKey("519.982.597-65")).toEqual({ type: "cpf", value: AMBIGUOUS });
		});
	});

	describe("should normalize randomized keys", () => {
		test("for CPFs", () => {
			for (let index = 0; index < 200; index++) {
				const cpf = generateCpf();

				expect(parsePixKey(cpf)?.value).toBe(cpf);
			}
		});

		test("for CNPJs", () => {
			for (let index = 0; index < 200; index++) {
				const cnpj = generateCnpj();

				expect(parsePixKey(cnpj)).toEqual({ type: "cnpj", value: cnpj });
			}
		});
	});
});
