import { describe, expect, test } from "../test/runtime";
import { isRepeatedDigits } from "./is-repeated-digits";

describe("isRepeatedDigits", () => {
	test("should return true when all characters are the same", () => {
		expect(isRepeatedDigits("00000000000")).toBe(true);
		expect(isRepeatedDigits("99999999999")).toBe(true);
		expect(isRepeatedDigits("AAAAAAAAAAAA")).toBe(true);
	});

	test("should return false when characters differ", () => {
		expect(isRepeatedDigits("12345678909")).toBe(false);
	});

	test("should return false for an empty string", () => {
		expect(isRepeatedDigits("")).toBe(false);
	});
});
