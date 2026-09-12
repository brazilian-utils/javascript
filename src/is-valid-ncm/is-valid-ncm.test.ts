import { describe, expect, it } from "../_internals/test/runtime";
import { isValidNcm } from "./is-valid-ncm";

describe("isValidNcm", () => {
	it("should validate an NCM code without a mask (cerveja de malte)", () => {
		expect(isValidNcm("22030000")).toBe(true);
	});

	it("should validate an NCM code with the dotted mask", () => {
		expect(isValidNcm("2203.00.00")).toBe(true);
	});

	it("should validate an NCM code given as a number", () => {
		expect(isValidNcm(22030000)).toBe(true);
	});

	it("should validate a leading zero NCM code (cavalos reprodutores de raça pura)", () => {
		expect(isValidNcm("01012100")).toBe(true);
		expect(isValidNcm("0101.21.00")).toBe(true);
	});

	it("should return false for a number that lost a leading zero (1012100 is not 01012100)", () => {
		expect(isValidNcm(1012100)).toBe(false);
	});

	it("should validate an NCM code with surrounding whitespace", () => {
		expect(isValidNcm(" 22030000 ")).toBe(true);
	});

	it("should return false for an unknown 8 digit code", () => {
		expect(isValidNcm("12345678")).toBe(false);
	});

	it("should return false when the digit count is not eight", () => {
		expect(isValidNcm("2203000")).toBe(false);
		expect(isValidNcm("220300000")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidNcm("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidNcm(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidNcm(undefined)).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidNcm("        ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidNcm("abcdefgh")).toBe(false);
	});
});
