import { describe, expect, test } from "../test/runtime";
import { resolveStateHolidayDate } from "./resolve-state-holiday-date";

describe("resolveStateHolidayDate", () => {
	test("should compute Easter Sunday for years across the supported range", () => {
		expect(resolveStateHolidayDate(1900, { easterOffset: 0 })).toEqual(new Date(1900, 3, 15));
		expect(resolveStateHolidayDate(2000, { easterOffset: 0 })).toEqual(new Date(2000, 3, 23));
		expect(resolveStateHolidayDate(2020, { easterOffset: 0 })).toEqual(new Date(2020, 3, 12));
		expect(resolveStateHolidayDate(2024, { easterOffset: 0 })).toEqual(new Date(2024, 2, 31));
		expect(resolveStateHolidayDate(2038, { easterOffset: 0 })).toEqual(new Date(2038, 3, 25));
		expect(resolveStateHolidayDate(2099, { easterOffset: 0 })).toEqual(new Date(2099, 3, 12));
	});

	test("should apply a negative and a positive offset from Easter", () => {
		expect(resolveStateHolidayDate(2024, { easterOffset: -47 })).toEqual(new Date(2024, 1, 13));
		expect(resolveStateHolidayDate(2024, { easterOffset: -2 })).toEqual(new Date(2024, 2, 29));
		expect(resolveStateHolidayDate(2024, { easterOffset: 60 })).toEqual(new Date(2024, 4, 30));
		expect(resolveStateHolidayDate(2023, { easterOffset: 60 })).toEqual(new Date(2023, 5, 8));
	});

	test("should resolve a fixed day and month", () => {
		expect(resolveStateHolidayDate(2024, { day: 9, month: 7 })).toEqual(new Date(2024, 6, 9));
		expect(resolveStateHolidayDate(1901, { day: 1, month: 1 })).toEqual(new Date(1901, 0, 1));
	});

	test("should prefer the Easter offset when a rule carries both forms", () => {
		expect(resolveStateHolidayDate(2024, { day: 9, month: 7, easterOffset: 0 })).toEqual(
			new Date(2024, 2, 31),
		);
	});

	test("should move a fixed date landing Monday to Friday on to the following Sunday", () => {
		const rule = { day: 11, month: 8, nextSundayWhenWeekday: true };

		expect(resolveStateHolidayDate(2025, rule)).toEqual(new Date(2025, 7, 17));
		expect(resolveStateHolidayDate(2026, rule)).toEqual(new Date(2026, 7, 16));
		expect(resolveStateHolidayDate(2027, rule)).toEqual(new Date(2027, 7, 15));
		expect(resolveStateHolidayDate(2028, rule)).toEqual(new Date(2028, 7, 13));
	});

	test("should leave a fixed date already falling on a Saturday or a Sunday where it is", () => {
		const rule = { day: 25, month: 11, nextSundayWhenWeekday: true };

		expect(resolveStateHolidayDate(2028, rule)).toEqual(new Date(2028, 10, 25));
		expect(resolveStateHolidayDate(2029, rule)).toEqual(new Date(2029, 10, 25));
	});

	test("should move an Easter derived date landing Monday to Friday on to the following Sunday", () => {
		expect(
			resolveStateHolidayDate(2024, { easterOffset: 60, nextSundayWhenWeekday: true }),
		).toEqual(new Date(2024, 5, 2));
	});
});
