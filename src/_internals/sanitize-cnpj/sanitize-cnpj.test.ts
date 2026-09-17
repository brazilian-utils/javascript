import { describe, expect, expectTypeOf, test } from "../test/runtime";
import { sanitizeCnpj } from "./sanitize-cnpj";

describe("sanitizeCnpj", () => {
	test("should keep only the digits when no version is given", () => {
		expect(sanitizeCnpj("11.222.333/0001-81")).toBe("11222333000181");
	});

	test("should keep only the digits on the numeric version", () => {
		expect(sanitizeCnpj("12.ABC.345/01DE-35", 1)).toBe("123450135");
	});

	test("should keep the upper cased letters on the alphanumeric version", () => {
		expect(sanitizeCnpj("12.abc.345/01de-35", 2)).toBe("12ABC34501DE35");
	});

	test("should read a number as its digits", () => {
		expect(sanitizeCnpj(11_222_333_000_181)).toBe("11222333000181");
	});

	test("types", () => {
		expectTypeOf(sanitizeCnpj).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(sanitizeCnpj).returns.toEqualTypeOf<string>();
	});
});
