import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCnae } from "./is-valid-cnae";

describe("isValidCnae", () => {
	it("should validate a CNAE code without a mask", () => {
		expect(isValidCnae("6201501")).toBe(true);
	});

	it("should validate a CNAE code with the NNNN-N/NN mask", () => {
		expect(isValidCnae("6201-5/01")).toBe(true);
	});

	it("should validate a CNAE code given as a number", () => {
		expect(isValidCnae(6201501)).toBe(true);
	});

	it("should validate a CNAE code with surrounding whitespace", () => {
		expect(isValidCnae(" 6201501 ")).toBe(true);
	});

	it("should return false for an unknown seven digit code", () => {
		expect(isValidCnae("0000000")).toBe(false);
	});

	it("should return false when the digit count is not seven", () => {
		expect(isValidCnae("620150")).toBe(false);
		expect(isValidCnae("62015011")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCnae("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCnae(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCnae(undefined)).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidCnae("       ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCnae("abcdefg")).toBe(false);
	});
});
