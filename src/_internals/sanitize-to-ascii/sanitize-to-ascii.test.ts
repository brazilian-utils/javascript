import { describe, expect, test } from "../test/runtime";
import { sanitizeToAscii } from "./sanitize-to-ascii";

describe("sanitizeToAscii", () => {
	test("should drop diacritics", () => {
		expect(sanitizeToAscii("São Paulo")).toBe("Sao Paulo");
		expect(sanitizeToAscii("BRASÍLIA")).toBe("BRASILIA");
		expect(sanitizeToAscii("José Antônio Nuñez")).toBe("Jose Antonio Nunez");
	});

	test("should drop characters outside printable ASCII", () => {
		expect(sanitizeToAscii("Loja 💸 Feliz")).toBe("Loja Feliz");
		expect(sanitizeToAscii(`a${String.fromCharCode(0)}b`)).toBe("ab");
	});

	test("should collapse whitespace and trim", () => {
		expect(sanitizeToAscii("  Fulano   de \n Tal  ")).toBe("Fulano de Tal");
	});

	test("should keep printable ASCII untouched", () => {
		expect(sanitizeToAscii("Fulano de Tal")).toBe("Fulano de Tal");
		expect(sanitizeToAscii("ACME LTDA. #1")).toBe("ACME LTDA. #1");
	});

	test("should return an empty string when nothing survives", () => {
		expect(sanitizeToAscii("   ")).toBe("");
		expect(sanitizeToAscii("💸")).toBe("");
	});
});
