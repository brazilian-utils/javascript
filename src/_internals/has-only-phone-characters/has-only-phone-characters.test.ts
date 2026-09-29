import { describe, expect, test } from "../test/runtime";
import { hasOnlyPhoneCharacters } from "./has-only-phone-characters";

describe("hasOnlyPhoneCharacters", () => {
	test("should accept digits and the characters a phone number is printed with", () => {
		expect(hasOnlyPhoneCharacters("11987654321")).toBe(true);
		expect(hasOnlyPhoneCharacters("+55 (11) 98765-4321")).toBe(true);
		expect(hasOnlyPhoneCharacters("11.98765/4321")).toBe(true);
		expect(hasOnlyPhoneCharacters(" 1130000000\n")).toBe(true);
		expect(hasOnlyPhoneCharacters("")).toBe(true);
	});

	test("should reject any other character", () => {
		expect(hasOnlyPhoneCharacters("11 98765-4321x")).toBe(false);
		expect(hasOnlyPhoneCharacters("tel 1130000000")).toBe(false);
		expect(hasOnlyPhoneCharacters("abc190")).toBe(false);
		expect(hasOnlyPhoneCharacters("1198765,4321")).toBe(false);
		expect(hasOnlyPhoneCharacters("1198765_4321")).toBe(false);
		expect(hasOnlyPhoneCharacters("١١987654321")).toBe(false);
	});
});
