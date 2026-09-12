import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import { holidayYears, monthDays, monthIndexes, stateCodes } from "../_internals/test/arbitraries";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getHolidays, type Holiday } from "../get-holidays/get-holidays";
import { isBusinessDay, type IsBusinessDayOptions } from "./is-business-day";

function getHolidaysFor(year: number, stateCode: StateCode | null): Holiday[] {
	return stateCode === null ? getHolidays(year) : getHolidays({ year, stateCode });
}

describe("isBusinessDay", () => {
	it("should return true for a plain weekday that is not a holiday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 2, 12))).toBe(true);
	});

	it("should return false for a Saturday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 6, 12))).toBe(false);
	});

	it("should return false for a Sunday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 7, 12))).toBe(false);
	});

	it("should return false for a national holiday (Ano novo, noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 1, 12))).toBe(false);
	});

	it("should return false for Corpus Christi 2024 by default (optional holiday counts, banking practice)", () => {
		expect(isBusinessDay(new Date(2024, 4, 30, 12))).toBe(false);
	});

	it("should return false outside the 1900-2099 range getHolidays computes (Mon 2100-01-04 and Fri 1899-12-29)", () => {
		expect(isBusinessDay(new Date(2100, 0, 4, 12))).toBe(false);
		expect(isBusinessDay(new Date(1899, 11, 29, 12))).toBe(false);
		expect(isBusinessDay(new Date(2099, 11, 31, 12))).toBe(true);
	});

	describe("state holidays", () => {
		it("should return false for a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: "SP" })).toBe(false);
		});

		it("should return true for the same date when stateCode is not provided", () => {
			expect(isBusinessDay(new Date(2024, 6, 9, 12))).toBe(true);
		});

		it("should ignore an unknown stateCode and fall back to national holidays", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: "XX" })).toBe(true);
		});
	});

	describe("includeOptional", () => {
		it("should return false for Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			expect(isBusinessDay(new Date(2024, 1, 13, 12))).toBe(false);
		});

		it("should return true for Carnaval 2024-02-13 when includeOptional is false", () => {
			expect(isBusinessDay(new Date(2024, 1, 13, 12), { includeOptional: false })).toBe(true);
		});

		it("should still return false for a national (non-optional) holiday when includeOptional is false", () => {
			expect(isBusinessDay(new Date(2024, 0, 1, 12), { includeOptional: false })).toBe(false);
		});
	});

	describe("year boundaries", () => {
		it("should return false for 2024-12-31 only if it were a holiday, but treat it as a business day (Tuesday, no holiday)", () => {
			expect(isBusinessDay(new Date(2024, 11, 31, 12))).toBe(true);
		});

		it("should return false for 2025-01-01 (Ano novo, next year)", () => {
			expect(isBusinessDay(new Date(2025, 0, 1, 12))).toBe(false);
		});

		it("should treat the inclusive boundary year 1900 as supported (1900-01-02 was a Tuesday, not Ano novo)", () => {
			expect(isBusinessDay(new Date(1900, 0, 2, 12))).toBe(true);
		});
	});

	describe("invalid input", () => {
		it("should return false for an invalid Date", () => {
			expect(isBusinessDay(new Date("not a date"))).toBe(false);
		});

		it("should return false for a non-Date value", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay("2024-01-02")).toBe(false);
		});

		it("should return false for null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay()).toBe(false);
		});
	});

	it("should not mutate the input Date", () => {
		const value = new Date(2024, 0, 6, 12);
		const original = new Date(value);

		isBusinessDay(value, { stateCode: "SP" });

		expect(value.getTime()).toBe(original.getTime());
	});

	describe("properties", () => {
		const stateAndOptionalArbitrary = fc.tuple(fc.option(stateCodes), fc.boolean());

		test("should return false for every Saturday and Sunday", () => {
			fc.assert(
				fc.property(holidayYears, monthIndexes, monthDays, (year, month, day) => {
					const date = new Date(year, month, day);

					if (date.getDay() === 0 || date.getDay() === 6) {
						expect(isBusinessDay(date)).toBe(false);
					}
				}),
			);
		});

		test("should agree with getHolidays and the weekend rule", () => {
			fc.assert(
				fc.property(
					holidayYears,
					monthIndexes,
					monthDays,
					stateAndOptionalArbitrary,
					(year, month, day, [stateCode, includeOptional]) => {
						const date = new Date(year, month, day);
						const holidays = getHolidaysFor(year, stateCode);
						const isHolidayMatch = holidays.some(
							(holiday) =>
								(includeOptional || holiday.type !== "optional") &&
								holiday.date.getMonth() === month &&
								holiday.date.getDate() === day,
						);
						const isWeekend = date.getDay() === 0 || date.getDay() === 6;
						const options = { stateCode: stateCode ?? undefined, includeOptional };

						expect(isBusinessDay(date, options)).toBe(!isWeekend && !isHolidayMatch);
					},
				),
			);
		});

		test("should never throw, regardless of the input", () => {
			expectNeverThrowsWithOptions(isBusinessDay, fc.anything(), fc.anything());
		});
	});
});

describe("isBusinessDay types", () => {
	test("should take a Date, options, and return a boolean", () => {
		expectTypeOf(isBusinessDay).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(isBusinessDay).parameter(1).toEqualTypeOf<IsBusinessDayOptions | undefined>();
		expectTypeOf<IsBusinessDayOptions["stateCode"]>().toEqualTypeOf<StateCode | undefined>();
		expectTypeOf<IsBusinessDayOptions["includeOptional"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(isBusinessDay).returns.toEqualTypeOf<boolean>();
	});
});
