import { STATE_CODES } from "../constants/state-codes";
import { DATA } from "../constants/states";
import { describe, expect, test } from "../test/runtime";
import { isStateCode } from "./is-state-code";

describe("isStateCode", () => {
	test("should return true for every state code of the states table", () => {
		for (const { code } of DATA) {
			expect(isStateCode(code)).toBe(true);
		}
	});

	test("should list exactly the codes of the states table, in the same order", () => {
		expect(STATE_CODES).toStrictEqual(DATA.map((state) => state.code));
	});

	test("should return false for a lower case, padded or unknown code", () => {
		expect(isStateCode("sp")).toBe(false);
		expect(isStateCode(" SP")).toBe(false);
		expect(isStateCode("XX")).toBe(false);
		expect(isStateCode("")).toBe(false);
	});

	test("should return false for a key of the prototype chain", () => {
		expect(isStateCode("constructor")).toBe(false);
		expect(isStateCode("__proto__")).toBe(false);
	});
});
