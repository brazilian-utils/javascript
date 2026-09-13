import { describe, expect, test } from "../test/runtime";
import { resolveServicePhoneDigits } from "./resolve-service-phone-digits";

describe("resolveServicePhoneDigits", () => {
	test("should drop a bare 55 when the national number left behind is a service number", () => {
		expect(resolveServicePhoneDigits("5508001234567")).toBe("08001234567");
		expect(resolveServicePhoneDigits("55 0300 123 4567")).toBe("03001234567");
		expect(resolveServicePhoneDigits(5_508_001_234_567)).toBe("08001234567");
	});

	test("should drop an explicit +55 or 0055 prefix", () => {
		expect(resolveServicePhoneDigits("+55 0800 123 4567")).toBe("08001234567");
		expect(resolveServicePhoneDigits("0055 4004-1234")).toBe("40041234");
		expect(resolveServicePhoneDigits("+55 190")).toBe("190");
	});

	test("should keep a bare 55 that is not followed by a service number", () => {
		expect(resolveServicePhoneDigits("55190")).toBe("55190");
		expect(resolveServicePhoneDigits("5540041234")).toBe("5540041234");
		expect(resolveServicePhoneDigits("5511987654321")).toBe("5511987654321");
	});

	test("should only sanitize a value without a country code", () => {
		expect(resolveServicePhoneDigits("0800 123 4567")).toBe("08001234567");
		expect(resolveServicePhoneDigits("(11) 98765-4321")).toBe("11987654321");
		expect(resolveServicePhoneDigits("")).toBe("");
	});
});
