import { describe, expect, test } from "../test/runtime";
import { normalizeStateCode } from "./normalize-state-code";

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
