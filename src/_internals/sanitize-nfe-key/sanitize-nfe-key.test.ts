import { describe, expect, expectTypeOf, test } from "../test/runtime";
import { sanitizeNfeKey } from "./sanitize-nfe-key";

describe("sanitizeNfeKey", () => {
	test("should keep the digits of a numeric key", () => {
		expect(sanitizeNfeKey("3517 0458 7165 2300 0119")).toBe("35170458716523000119");
	});

	test("should keep the upper cased letters of an alphanumeric CNPJ in positions 7 to 18", () => {
		expect(sanitizeNfeKey("3526 0712 abc3 4501 DE35")).toBe("35260712ABC34501DE35");
	});

	test("should keep a letter in position 7 and in position 18, the two ends of the CNPJ root and order", () => {
		expect(sanitizeNfeKey("352607A2ABC34501DZ35")).toBe("352607A2ABC34501DZ35");
	});

	test("should drop a letter in positions 1 to 6", () => {
		expect(sanitizeNfeKey("NFe35260A")).toBe("35260");
	});

	test("should drop a letter in positions 19 and 20, the CNPJ check digits, and after them", () => {
		expect(sanitizeNfeKey("35260712ABC34501DEAB35X55")).toBe("35260712ABC34501DE3555");
	});

	test("should read a number as its digits", () => {
		expect(sanitizeNfeKey(3_526_071_234)).toBe("3526071234");
	});

	test("types", () => {
		expectTypeOf(sanitizeNfeKey).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(sanitizeNfeKey).returns.toEqualTypeOf<string>();
	});
});
