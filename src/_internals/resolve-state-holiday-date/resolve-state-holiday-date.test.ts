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

	test("should throw when the rule defines neither an Easter offset nor both day and month", () => {
		const message =
			"State holiday entry must define either `easterOffset` or both `day` and `month`";

		expect(() => resolveStateHolidayDate(2024, {})).toThrow(message);
		expect(() => resolveStateHolidayDate(2024, { day: 10 })).toThrow(message);
		expect(() => resolveStateHolidayDate(2024, { month: 5 })).toThrow(message);
	});
});
