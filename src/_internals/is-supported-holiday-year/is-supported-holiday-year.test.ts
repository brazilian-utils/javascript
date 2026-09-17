import { describe, expect, test } from "../test/runtime";
import { isSupportedHolidayYear } from "./is-supported-holiday-year";

describe("isSupportedHolidayYear", () => {
	test("should accept a year inside the range the holiday tables cover", () => {
		expect(isSupportedHolidayYear(2024)).toBe(true);
	});

	test("should accept both bounds, 1900 and 2099, inclusively", () => {
		expect(isSupportedHolidayYear(1900)).toBe(true);
		expect(isSupportedHolidayYear(2099)).toBe(true);
	});

	test("should reject the year right below and right above the range", () => {
		expect(isSupportedHolidayYear(1899)).toBe(false);
		expect(isSupportedHolidayYear(2100)).toBe(false);
	});
});
