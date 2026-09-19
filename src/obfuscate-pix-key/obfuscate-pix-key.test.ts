import * as fc from "fast-check";

import { anyGarbage, anyText } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { generatePhone } from "../generate-phone/generate-phone";
import { getPixKeyInfo } from "../get-pix-key-info/get-pix-key-info";
import { obfuscatePixKey } from "./obfuscate-pix-key";

describe("obfuscatePixKey", () => {
	test("should hide the first 3 digits and the check digits of a CPF key", () => {
		expect(obfuscatePixKey("12345678909")).toBe("***.456.789-**");
		expect(obfuscatePixKey("123.456.789-09")).toBe("***.456.789-**");
		expect(obfuscatePixKey(" 123.456.789-09 ")).toBe("***.456.789-**");
	});

	test("should hide the first 2 characters and the check digits of a CNPJ key", () => {
		expect(obfuscatePixKey("12345678000195")).toBe("**.345.678/0001-**");
		expect(obfuscatePixKey("12.345.678/0001-95")).toBe("**.345.678/0001-**");
		expect(obfuscatePixKey("q0SLFMBD7VX439")).toBe("**.SLF.MBD/7VX4-**");
	});

	test("should keep the country code, the DDD and the last 2 digits of a phone key", () => {
		expect(obfuscatePixKey("+5511987654321")).toBe("+55 11 *****-**21");
		expect(obfuscatePixKey("(11) 98765-4321")).toBe("+55 11 *****-**21");
		expect(obfuscatePixKey("11987654321")).toBe("+55 11 *****-**21");
	});

	test("should lowercase and hide an e-mail key", () => {
		expect(obfuscatePixKey("fulano@example.com")).toBe("fu****@ex*********");
		expect(obfuscatePixKey(" Fulano@Example.COM ")).toBe("fu****@ex*********");
	});

	test("should return a random key whole, lowercased", () => {
		expect(obfuscatePixKey("71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d")).toBe(
			"71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d",
		);
		expect(obfuscatePixKey("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D")).toBe(
			"71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d",
		);
	});

	test("should read an 11 digit value valid as a CPF and as a phone the way getPixKeyInfo does", () => {
		expect(obfuscatePixKey("51998259765")).toBe("***.982.597-**");
		expect(obfuscatePixKey("+5551998259765")).toBe("+55 51 *****-**65");
	});

	test("should return an empty string for a value that is not a Pix key", () => {
		expect(obfuscatePixKey("")).toBe("");
		expect(obfuscatePixKey("not a key")).toBe("");
		expect(obfuscatePixKey("12345678900")).toBe("");
		expect(obfuscatePixKey("(11) 3000-0000")).toBe("");
		expect(obfuscatePixKey("fulano@example")).toBe("");
		expect(obfuscatePixKey("__proto__")).toBe("");
	});

	test("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(obfuscatePixKey(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscatePixKey()).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscatePixKey(12_345_678_909)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscatePixKey({ toString: () => "12345678909" })).toBe("");
	});

	describe("properties", () => {
		const emails = fc.stringMatching(/^[a-z0-9]{1,10}@[a-z0-9]{1,10}\.com$/);

		test("should print every kind of key in its documented shape", () => {
			fc.assert(
				fc.property(emails, fc.uuid(), (email, evp) => {
					const phone = `+55${generatePhone("mobile")}`;

					expect(obfuscatePixKey(generateCpf())).toMatch(/^\*{3}\.\d{3}\.\d{3}-\*{2}$/);
					expect(obfuscatePixKey(generateCnpj())).toMatch(/^\*{2}\.\d{3}\.\d{3}\/\d{4}-\*{2}$/);
					expect(obfuscatePixKey(phone)).toMatch(/^\+55 \d{2} \*{5}-\*{2}\d{2}$/);
					expect(obfuscatePixKey(email)).toMatch(/^[a-z0-9]{0,2}\*+@[a-z0-9.]{2}\*+$/);
					expect(obfuscatePixKey(evp)).toBe(evp);
				}),
			);
		});

		test("should return an empty string exactly when getPixKeyInfo rejects the value", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					expect(obfuscatePixKey(value) === "").toBe(getPixKeyInfo(value) === null);
				}),
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(obfuscatePixKey, "string", fc.oneof(anyText, anyGarbage));
		});
	});
});

describe("obfuscatePixKey types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(obfuscatePixKey).parameters.toEqualTypeOf<[value: string]>();
		expectTypeOf(obfuscatePixKey).returns.toEqualTypeOf<string>();
	});
});
