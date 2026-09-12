import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCfop } from "./is-valid-cfop";

describe("isValidCfop", () => {
	it("should return true for a known CFOP code as a string", () => {
		expect(isValidCfop("5102")).toBe(true);
	});

	it("should return true for a known CFOP code as a number", () => {
		expect(isValidCfop(5102)).toBe(true);
	});

	it("should return true for a masked CFOP code (5.102)", () => {
		expect(isValidCfop("5.102")).toBe(true);
	});

	it("should return true for a code with surrounding whitespace", () => {
		expect(isValidCfop(" 5102 ")).toBe(true);
	});

	it("should validate the sale of goods acquired from third parties (CFOP 5102, Ajuste SINIEF 07/2001)", () => {
		expect(isValidCfop("5102")).toBe(true);
	});

	it("should accept the codes the mirror glues into the previous row (1306, 1414 and 6913)", () => {
		expect(isValidCfop("1306")).toBe(true);
		expect(isValidCfop("1414")).toBe(true);
		expect(isValidCfop("6913")).toBe(true);
	});

	it("should return false for an unknown 4 digit code", () => {
		expect(isValidCfop("0000")).toBe(false);
	});

	it("should return false for a code with a length different from 4", () => {
		expect(isValidCfop("510")).toBe(false);
		expect(isValidCfop("51020")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCfop("")).toBe(false);
	});

	it("should return false for null", () => {
		// @ts-expect-error not a string or number
		expect(isValidCfop(null)).toBe(false);
	});

	it("should return false for undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCfop()).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCfop("abcd")).toBe(false);
	});
});
