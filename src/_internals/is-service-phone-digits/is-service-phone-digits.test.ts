import { describe, expect, test } from "../test/runtime";
import { isServicePhoneDigits } from "./is-service-phone-digits";

describe("isServicePhoneDigits", () => {
	test("should accept the three families of service number", () => {
		expect(isServicePhoneDigits("08001234567")).toBe(true);
		expect(isServicePhoneDigits("03031234567")).toBe(true);
		expect(isServicePhoneDigits("30031234")).toBe(true);
		expect(isServicePhoneDigits("40041234")).toBe(true);
		expect(isServicePhoneDigits("190")).toBe(true);
		expect(isServicePhoneDigits("112")).toBe(true);
	});

	test("should reject anything else", () => {
		expect(isServicePhoneDigits("")).toBe(false);
		expect(isServicePhoneDigits("11987654321")).toBe(false);
		expect(isServicePhoneDigits("40201234")).toBe(false);
		expect(isServicePhoneDigits("101")).toBe(false);
		expect(isServicePhoneDigits("911")).toBe(false);
		expect(isServicePhoneDigits("5508001234567")).toBe(false);
	});
});
