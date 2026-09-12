import { describe, expect, it } from "../_internals/test/runtime";
import { CSOSN_CODES } from "./constants";
import { isValidCsosn } from "./is-valid-csosn";

describe("isValidCsosn", () => {
	it("should return true for every known CSOSN code", () => {
		for (const code of CSOSN_CODES) {
			expect(isValidCsosn(code)).toBe(true);
		}
	});

	it("should return true for a number input", () => {
		expect(isValidCsosn(101)).toBe(true);
	});

	it("should return true with surrounding whitespace", () => {
		expect(isValidCsosn(" 101 ")).toBe(true);
	});

	it("should return false for an unknown 3 digit code", () => {
		expect(isValidCsosn("999")).toBe(false);
	});

	it("should return false for a length different from 3", () => {
		expect(isValidCsosn("10")).toBe(false);
		expect(isValidCsosn("1010")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCsosn("")).toBe(false);
	});

	it("should return false for null", () => {
		// @ts-expect-error not a string or number
		expect(isValidCsosn(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCsosn()).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCsosn("abc")).toBe(false);
	});
});
