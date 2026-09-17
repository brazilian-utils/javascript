import { describe, expect, test } from "../test/runtime";
import { stripPhoneCountryCode } from "./strip-phone-country-code";

describe("stripPhoneCountryCode", () => {
	test("should drop an explicit +55 or 0055 prefix", () => {
		expect(stripPhoneCountryCode("+55 0800 123 4567")).toBe("08001234567");
		expect(stripPhoneCountryCode("+5511987654321")).toBe("11987654321");
		expect(stripPhoneCountryCode("0055 4004-1234")).toBe("40041234");
		expect(stripPhoneCountryCode(" + 55 190")).toBe("190");
	});

	test("should keep a bare leading 55, which is also a DDD", () => {
		expect(stripPhoneCountryCode("55 3333-4444")).toBe("5533334444");
		expect(stripPhoneCountryCode("5511987654321")).toBe("5511987654321");
		expect(stripPhoneCountryCode(5_533_334_444)).toBe("5533334444");
	});

	test("should only sanitize a value without a prefix", () => {
		expect(stripPhoneCountryCode("(11) 98765-4321")).toBe("11987654321");
		expect(stripPhoneCountryCode("11 3000 5500")).toBe("1130005500");
		expect(stripPhoneCountryCode("11 98765-4321 +55")).toBe("1198765432155");
		expect(stripPhoneCountryCode(190)).toBe("190");
		expect(stripPhoneCountryCode("")).toBe("");
	});
});
