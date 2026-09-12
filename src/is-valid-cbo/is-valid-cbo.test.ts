import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCbo } from "./is-valid-cbo";

describe("isValidCbo", () => {
	it("should validate a CBO code without a mask", () => {
		expect(isValidCbo("212405")).toBe(true);
	});

	it("should validate a CBO code with the hyphen mask", () => {
		expect(isValidCbo("2124-05")).toBe(true);
	});

	it("should validate a CBO code given as a number", () => {
		expect(isValidCbo(212405)).toBe(true);
	});

	it("should validate a CBO code with surrounding whitespace", () => {
		expect(isValidCbo(" 212405 ")).toBe(true);
	});

	it("should return false for an unknown six digit code", () => {
		expect(isValidCbo("000000")).toBe(false);
	});

	it("should return false when the digit count is not six", () => {
		expect(isValidCbo("21240")).toBe(false);
		expect(isValidCbo("2124055")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCbo("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCbo(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCbo(undefined)).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidCbo("      ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCbo("abcdef")).toBe(false);
	});
});
