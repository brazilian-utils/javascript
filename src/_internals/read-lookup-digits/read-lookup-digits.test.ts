import { describe, expect, test } from "../test/runtime";
import { readLookupDigits } from "./read-lookup-digits";

describe("readLookupDigits", () => {
	test("should read a string of digits as it is", () => {
		expect(readLookupDigits("3550308")).toBe("3550308");
		expect(readLookupDigits("001")).toBe("001");
	});

	test("should drop whitespace and hyphens", () => {
		expect(readLookupDigits(" 355-030-8 ")).toBe("3550308");
		expect(readLookupDigits("0-01")).toBe("001");
		expect(readLookupDigits("11\t")).toBe("11");
	});

	test("should read a non-negative integer number", () => {
		expect(readLookupDigits(0)).toBe("0");
		expect(readLookupDigits(3_550_308)).toBe("3550308");
	});

	test("should reject a string with any other character instead of stripping it", () => {
		expect(readLookupDigits("1e1")).toBeNull();
		expect(readLookupDigits("1.1")).toBeNull();
		expect(readLookupDigits("a1b1")).toBeNull();
		expect(readLookupDigits("DDD 11")).toBeNull();
		expect(readLookupDigits("R$ 35")).toBeNull();
		expect(readLookupDigits("35/")).toBeNull();
		expect(readLookupDigits("0000000A")).toBeNull();
	});

	test("should reject a string with no digit left", () => {
		expect(readLookupDigits("")).toBeNull();
		expect(readLookupDigits(" - ")).toBeNull();
	});

	test("should reject a negative, fractional or unsafe number and a non-code value", () => {
		expect(readLookupDigits(-11)).toBeNull();
		expect(readLookupDigits(1.1)).toBeNull();
		expect(readLookupDigits(2 ** 53)).toBeNull();
		expect(readLookupDigits(null)).toBeNull();
		expect(readLookupDigits(["11"])).toBeNull();
	});
});
