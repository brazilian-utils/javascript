import { STATE_CODES } from "../constants/state-codes";
import { describe, expect, test } from "../test/runtime";
import { normalizeStateCode, readStateCode } from "./read-state-code";

describe("readStateCode", () => {
	test("should read every state code as it is", () => {
		for (const code of STATE_CODES) {
			expect(readStateCode(code)).toBe(code);
		}
	});

	test("should ignore case and surrounding whitespace", () => {
		expect(readStateCode("sp")).toBe("SP");
		expect(readStateCode(" Rj\t")).toBe("RJ");
	});

	test("should return null for a string that is not a state code", () => {
		for (const value of ["XX", "ZZ", "", "   ", "S P", "SPA", "__proto__", "constructor"]) {
			expect(readStateCode(value)).toBeNull();
		}
	});

	test("should return null for a value that is not a string", () => {
		for (const value of [null, undefined, 35, {}, ["SP"], new String("SP")]) {
			expect(readStateCode(value)).toBeNull();
		}
	});
});

describe("normalizeStateCode", () => {
	test("should trim and upper case a string without checking it is a state", () => {
		expect(normalizeStateCode(" sp ")).toBe("SP");
		expect(normalizeStateCode("xx")).toBe("XX");
		expect(normalizeStateCode("")).toBe("");
	});

	test("should return an empty string for a value that is not a string", () => {
		for (const value of [null, undefined, 35, {}, new String("SP")]) {
			expect(normalizeStateCode(value)).toBe("");
		}
	});
});
