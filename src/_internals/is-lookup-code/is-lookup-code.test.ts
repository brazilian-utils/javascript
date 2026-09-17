import { describe, expect, test } from "../test/runtime";
import { isLookupCode } from "./is-lookup-code";

describe("isLookupCode", () => {
	test("should return true for any string, whatever it holds", () => {
		expect(isLookupCode("abc")).toBe(true);
		expect(isLookupCode("")).toBe(true);
		expect(isLookupCode("3550308")).toBe(true);
	});

	test("should return true for a non-negative integer number, zero included", () => {
		expect(isLookupCode(0)).toBe(true);
		expect(isLookupCode(1)).toBe(true);
		expect(isLookupCode(3_550_308)).toBe(true);
	});

	test("should return false for a negative or fractional number", () => {
		expect(isLookupCode(-1)).toBe(false);
		expect(isLookupCode(1.5)).toBe(false);
	});

	test("should return false for a number past the safe integer range, whose digits are lost", () => {
		expect(isLookupCode(2 ** 53)).toBe(false);
		expect(isLookupCode(Number.MAX_VALUE)).toBe(false);
	});

	test("should return false for a number that is not finite", () => {
		expect(isLookupCode(Number.NaN)).toBe(false);
		expect(isLookupCode(Number.POSITIVE_INFINITY)).toBe(false);
	});

	test("should return false for null and undefined", () => {
		const isLookupCodeWithoutArgument = isLookupCode as unknown as () => boolean;

		expect(isLookupCode(null)).toBe(false);
		expect(isLookupCodeWithoutArgument()).toBe(false);
	});

	test("should return false for an object", () => {
		expect(isLookupCode({})).toBe(false);
		expect(isLookupCode(Object.create(null))).toBe(false);
	});
});
