import { describe, expect, test } from "../test/runtime";
import { detectPixKeyType } from "./detect-pix-key-type";

describe("detectPixKeyType", () => {
	test("should tell each kind of key, whatever its case and spacing", () => {
		expect(detectPixKeyType("123.456.789-09")).toBe("cpf");
		expect(detectPixKeyType(" 11.222.333/0001-81 ")).toBe("cnpj");
		expect(detectPixKeyType("Fulano@Example.COM")).toBe("email");
		expect(detectPixKeyType("(11) 98765-4321")).toBe("phone");
		expect(detectPixKeyType("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D")).toBe("evp");
	});

	test("should check an e-mail address once lowercased, which turns the Kelvin sign into a k", () => {
		expect(detectPixKeyType("Kelvin@example.com")).toBe("email");
	});

	test("should read a value valid both as a CPF and as a mobile number as a CPF", () => {
		expect(detectPixKeyType("51998259765")).toBe("cpf");
		expect(detectPixKeyType("+5551998259765")).toBe("phone");
	});

	test("should return null for a value that is no Pix key", () => {
		expect(detectPixKeyType("")).toBeNull();
		expect(detectPixKeyType("(11) 3333-4444")).toBeNull();
		expect(detectPixKeyType("abc123.456.789-09")).toBeNull();
		expect(detectPixKeyType("not an email@")).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(detectPixKeyType(null)).toBeNull();
	});
});
