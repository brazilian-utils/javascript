import { describe, expect, test } from "../test/runtime";
import { normalizePhone } from "./normalize-phone";

describe("normalizePhone", () => {
	test("should keep a national number untouched", () => {
		expect(normalizePhone("11987654321")).toBe("11987654321");
		expect(normalizePhone("1130000000")).toBe("1130000000");
	});

	test("should remove the country code when the rest is a national number", () => {
		expect(normalizePhone("+55 (11) 98765-4321")).toBe("11987654321");
		expect(normalizePhone("5511987654321")).toBe("11987654321");
		expect(normalizePhone("551130000000")).toBe("1130000000");
		expect(normalizePhone("005511987654321")).toBe("11987654321");
		expect(normalizePhone("+55 55 98765-4321")).toBe("55987654321");
	});

	test("should remove an explicit country code whatever follows it", () => {
		expect(normalizePhone("+55")).toBe("");
		expect(normalizePhone("+55 11 9")).toBe("119");
		expect(normalizePhone("+55 55")).toBe("55");
		expect(normalizePhone("0055 11 98765")).toBe("1198765");
		expect(normalizePhone("  + 55 (11) 3000")).toBe("113000");
		expect(normalizePhone("+55 190")).toBe("190");
		expect(normalizePhone("+55 55 98765-4321 12")).toBe("5598765432112");
	});

	test("should keep a bare 55 while the number is short", () => {
		expect(normalizePhone("55")).toBe("55");
		expect(normalizePhone("55 11 9")).toBe("55119");
		expect(normalizePhone("(00) 55 11 98765")).toBe("00551198765");
	});

	test("should keep the leading 55 when it is an area code", () => {
		expect(normalizePhone("55987654321")).toBe("55987654321");
		expect(normalizePhone("5533334444")).toBe("5533334444");
	});

	test("should keep the digits when the remainder is not a national number", () => {
		expect(normalizePhone("55123")).toBe("55123");
		expect(normalizePhone("551198765432112345")).toBe("551198765432112345");
	});

	test("should return an empty string when there are no digits", () => {
		expect(normalizePhone("")).toBe("");
		expect(normalizePhone("abc")).toBe("");
	});
});
