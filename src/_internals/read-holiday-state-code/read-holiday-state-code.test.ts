import { STATE_CODES } from "../constants/state-codes";
import { describe, expect, test } from "../test/runtime";
import { readHolidayStateCode } from "./read-holiday-state-code";

describe("readHolidayStateCode", () => {
	test("should read every state code as it is", () => {
		for (const code of STATE_CODES) {
			expect(readHolidayStateCode(code)).toBe(code);
		}
	});

	test("should ignore case and surrounding whitespace", () => {
		expect(readHolidayStateCode("sp")).toBe("SP");
		expect(readHolidayStateCode(" Rj\t")).toBe("RJ");
	});

	test("should read an absent stateCode as no state", () => {
		const options: { stateCode?: string } = {};

		expect(readHolidayStateCode(options.stateCode)).toBeUndefined();
	});

	test("should reject a string that is not a state code", () => {
		expect(readHolidayStateCode("XX")).toBeNull();
		expect(readHolidayStateCode("")).toBeNull();
		expect(readHolidayStateCode("   ")).toBeNull();
		expect(readHolidayStateCode("S P")).toBeNull();
		expect(readHolidayStateCode("__proto__")).toBeNull();
		expect(readHolidayStateCode("constructor")).toBeNull();
	});

	test("should reject a value that is not a string", () => {
		expect(readHolidayStateCode(null)).toBeNull();
		expect(readHolidayStateCode(35)).toBeNull();
		expect(readHolidayStateCode({})).toBeNull();
	});
});
