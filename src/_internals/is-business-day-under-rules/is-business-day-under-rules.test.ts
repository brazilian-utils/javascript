import { describe, expect, test } from "../test/runtime";
import { isBusinessDayUnderRules } from "./is-business-day-under-rules";

const WEEKDAYS = { stateCode: undefined, includeOptional: true, includeSaturday: false };

describe("isBusinessDayUnderRules", () => {
	test("should accept an ordinary weekday", () => {
		expect(isBusinessDayUnderRules(new Date(2024, 0, 2), WEEKDAYS)).toBe(true);
	});

	test("should reject a national holiday", () => {
		expect(isBusinessDayUnderRules(new Date(2024, 0, 1), WEEKDAYS)).toBe(false);
	});

	test("should reject Sunday, and Saturday unless it is included", () => {
		expect(
			isBusinessDayUnderRules(new Date(2024, 0, 7), { ...WEEKDAYS, includeSaturday: true }),
		).toBe(false);
		expect(isBusinessDayUnderRules(new Date(2024, 0, 6), WEEKDAYS)).toBe(false);
		expect(
			isBusinessDayUnderRules(new Date(2024, 0, 6), { ...WEEKDAYS, includeSaturday: true }),
		).toBe(true);
	});

	test("should keep a holiday that falls on a Saturday a non-business day", () => {
		expect(
			isBusinessDayUnderRules(new Date(2024, 8, 7), { ...WEEKDAYS, includeSaturday: true }),
		).toBe(false);
	});

	test("should count optional holidays only when asked to", () => {
		expect(isBusinessDayUnderRules(new Date(2024, 1, 12), WEEKDAYS)).toBe(false);
		expect(
			isBusinessDayUnderRules(new Date(2024, 1, 12), { ...WEEKDAYS, includeOptional: false }),
		).toBe(true);
	});

	test("should add the holidays of the state read", () => {
		expect(isBusinessDayUnderRules(new Date(2024, 6, 9), { ...WEEKDAYS, stateCode: "SP" })).toBe(
			false,
		);
		expect(isBusinessDayUnderRules(new Date(2024, 6, 9), WEEKDAYS)).toBe(true);
	});

	test("should reject a year outside the supported range", () => {
		expect(isBusinessDayUnderRules(new Date(2100, 0, 4), WEEKDAYS)).toBe(false);
		expect(isBusinessDayUnderRules(new Date(1899, 0, 3), WEEKDAYS)).toBe(false);
	});
});
