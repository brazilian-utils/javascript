import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import {
	anyBusinessDayDate,
	anyBusinessDayOptions,
	holidayYears,
	monthDays,
	monthIndexes,
	stateCodes,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getHolidays, type Holiday } from "../get-holidays/get-holidays";
import { isBusinessDay, type BusinessDayOptions } from "./is-business-day";

const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype);

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

		it("should return false for a stateCode that is present and is not a string, as isHoliday does, instead of ignoring it", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: 5 })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: null })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: {} })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: ["SP"] })).toBe(false);
		});

		it("should read an explicit undefined stateCode as no state at all, the only non-string value that is not rejected", () => {
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: undefined })).toBe(true);
			expect(isBusinessDay(new Date(2024, 0, 1, 12), { stateCode: undefined })).toBe(false);
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				// @ts-expect-error: intentionally invalid input
				expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode })).toBe(true);
				// @ts-expect-error: intentionally invalid input
				expect(isBusinessDay(new Date(2024, 0, 1, 12), { stateCode })).toBe(false);
			}
		});

		it("should treat Monday 11/08/2025 as a business day in SC, since Lei SC nº 18.531/2022 moves the feriado to Sunday 17/08", () => {
			expect(isBusinessDay(new Date(2025, 7, 11, 12), { stateCode: "SC" })).toBe(true);
			expect(isBusinessDay(new Date(2025, 7, 17, 12), { stateCode: "SC" })).toBe(false);
		});

		it("should treat Corpus Christi as a non-business day in the DF even with includeOptional false, since Lei distrital nº 72/1989 declares it a feriado", () => {
			expect(
				isBusinessDay(new Date(2024, 4, 30, 12), { stateCode: "DF", includeOptional: false }),
			).toBe(false);
			expect(
				isBusinessDay(new Date(2024, 4, 30, 12), { stateCode: "SP", includeOptional: false }),
			).toBe(true);
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

	describe("includeSaturday", () => {
		it("should return true for a plain Saturday when includeSaturday is true (Sat 2024-01-06, IN MTP nº 2/2021 art. 14, I)", () => {
			expect(isBusinessDay(new Date(2024, 0, 6, 12), { includeSaturday: true })).toBe(true);
		});

		it("should still return false for a Sunday when includeSaturday is true (Sun 2024-01-07, the article excludes it)", () => {
			expect(isBusinessDay(new Date(2024, 0, 7, 12), { includeSaturday: true })).toBe(false);
		});

		it("should still return false for a national holiday that falls on a Saturday (Sat 2024-09-07, Independência)", () => {
			expect(isBusinessDay(new Date(2024, 8, 7, 12), { includeSaturday: true })).toBe(false);
		});

		it("should still return false for Finados on Saturday 2024-11-02, and true for the plain Saturday a week later", () => {
			expect(isBusinessDay(new Date(2024, 10, 2, 12), { includeSaturday: true })).toBe(false);
			expect(isBusinessDay(new Date(2024, 10, 9, 12), { includeSaturday: true })).toBe(true);
		});

		it("should still return false for a state holiday that falls on a Saturday (Sat 2024-11-30, Dia do Evangélico in DF)", () => {
			expect(
				isBusinessDay(new Date(2024, 10, 30, 12), { stateCode: "DF", includeSaturday: true }),
			).toBe(false);
			expect(isBusinessDay(new Date(2024, 10, 30, 12), { includeSaturday: true })).toBe(true);
		});

		it("should leave Monday to Friday untouched (Tue 2024-01-02 is a business day, Mon 2024-01-01 is Ano novo)", () => {
			expect(isBusinessDay(new Date(2024, 0, 2, 12), { includeSaturday: true })).toBe(true);
			expect(isBusinessDay(new Date(2024, 0, 1, 12), { includeSaturday: true })).toBe(false);
		});
	});

	describe("no breaking change", () => {
		it("should keep the Monday to Friday count when includeSaturday is absent, false or undefined (Sat 2024-01-06)", () => {
			expect(isBusinessDay(new Date(2024, 0, 6, 12))).toBe(false);
			expect(isBusinessDay(new Date(2024, 0, 6, 12), {})).toBe(false);
			expect(isBusinessDay(new Date(2024, 0, 6, 12), { includeSaturday: false })).toBe(false);
			expect(isBusinessDay(new Date(2024, 0, 6, 12), { includeSaturday: undefined })).toBe(false);
			expect(isBusinessDay(new Date(2024, 0, 6, 12), { stateCode: "SP" })).toBe(false);
			expect(isBusinessDay(new Date(2024, 0, 6, 12), { includeOptional: false })).toBe(false);
		});

		it("should keep the Monday to Friday count for every Saturday of January 2024 without the option (6, 13, 20 and 27)", () => {
			for (const day of [6, 13, 20, 27]) {
				expect(isBusinessDay(new Date(2024, 0, day, 12))).toBe(false);
			}
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
		const optionsArbitrary = fc.tuple(fc.option(stateCodes), fc.boolean(), fc.boolean());

		test("should return false for every Saturday and Sunday, and still for every Sunday when includeSaturday is true", () => {
			fc.assert(
				fc.property(holidayYears, monthIndexes, monthDays, (year, month, day) => {
					const date = new Date(year, month, day);

					if (date.getDay() === 0 || date.getDay() === 6) {
						expect(isBusinessDay(date)).toBe(false);
					}

					if (date.getDay() === 0) {
						expect(isBusinessDay(date, { includeSaturday: true })).toBe(false);
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
					optionsArbitrary,
					(year, month, day, [stateCode, includeOptional, includeSaturday]) => {
						const date = new Date(year, month, day);
						const holidays = getHolidaysFor(year, stateCode);
						const isHolidayMatch = holidays.some(
							(holiday) =>
								(includeOptional || holiday.type !== "optional") &&
								holiday.date.getMonth() === month &&
								holiday.date.getDate() === day,
						);
						const isWeekend = date.getDay() === 0 || (date.getDay() === 6 && !includeSaturday);
						const options = {
							stateCode: stateCode ?? undefined,
							includeOptional,
							includeSaturday,
						};

						expect(isBusinessDay(date, options)).toBe(!isWeekend && !isHolidayMatch);
					},
				),
			);
		});

		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithOptions(isBusinessDay, anyBusinessDayDate, anyBusinessDayOptions);
		});
	});
});

describe("isBusinessDay types", () => {
	test("should take a Date, options, and return a boolean", () => {
		expectTypeOf(isBusinessDay).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(isBusinessDay).parameter(1).toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf<BusinessDayOptions["stateCode"]>().toEqualTypeOf<StateCode | undefined>();
		expectTypeOf<BusinessDayOptions["includeOptional"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<BusinessDayOptions["includeSaturday"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(isBusinessDay).returns.toEqualTypeOf<boolean>();
	});
});
