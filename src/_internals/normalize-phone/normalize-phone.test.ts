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
