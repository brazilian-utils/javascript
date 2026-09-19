import * as fc from "fast-check";

import {
	anyBusinessDayOptions,
	businessDayDates,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithArguments } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, inTimeZone, it, test } from "../_internals/test/runtime";
import { addBusinessDays } from "../add-business-days/add-business-days";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";
import { differenceInBusinessDays } from "./difference-in-business-days";

describe("differenceInBusinessDays", () => {
	it("should match the date-fns differenceInBusinessDays example (2014-07-20 minus 2014-01-10 is 136 weekdays, https://date-fns.org/docs/differenceInBusinessDays) minus the 5 Brazilian holidays that fall on a weekday in between (Carnaval, Sexta-feira Santa, Tiradentes, Dia do trabalhador and Corpus Christi)", () => {
		const result = differenceInBusinessDays(new Date(2014, 6, 20), new Date(2014, 0, 10));

		expect(result).toBe(131);
	});

	it("should return 0 for the same calendar day", () => {
		expect(differenceInBusinessDays(new Date(2024, 0, 2, 18), new Date(2024, 0, 2, 9))).toBe(0);
	});

	it("should count the earlier date when it is a business day and exclude the later one (Tue 2024-01-02 to Wed 2024-01-03)", () => {
		expect(differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2))).toBe(1);
	});

	it("should not count the earlier date when it is a holiday (2024-01-01 Ano novo to 2024-01-02)", () => {
		expect(differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1))).toBe(0);
	});

	it("should skip the weekend in between (Fri 2024-01-05 to Mon 2024-01-08)", () => {
		expect(differenceInBusinessDays(new Date(2024, 0, 8), new Date(2024, 0, 5))).toBe(1);
	});

	it("should ignore the time of day of both dates", () => {
		expect(differenceInBusinessDays(new Date(2024, 0, 3, 0, 1), new Date(2024, 0, 2, 23, 59))).toBe(
			1,
		);
	});

	describe("supported years", () => {
		it("should return null when either date is outside 1900-2099", () => {
			expect(differenceInBusinessDays(new Date(2100, 0, 5), new Date(2100, 0, 4))).toBeNull();
			expect(differenceInBusinessDays(new Date(2100, 0, 4), new Date(2099, 11, 31))).toBeNull();
			expect(differenceInBusinessDays(new Date(1900, 0, 2), new Date(1899, 11, 29))).toBeNull();
		});

		it("should accept the inclusive boundary years 1900 and 2099 (same-day range, so the result is 0 rather than null)", () => {
			expect(differenceInBusinessDays(new Date(1900, 0, 2), new Date(1900, 0, 2))).toBe(0);
			expect(differenceInBusinessDays(new Date(2099, 0, 2), new Date(2099, 0, 2))).toBe(0);
		});
	});

	describe("sign convention", () => {
		it("should return a negative number when the later date is actually before the earlier one (Tue 2024-01-02 given as laterDate, Wed 2024-01-03 as earlierDate)", () => {
			expect(differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3))).toBe(-1);
		});

		it("should return positive zero, not negative zero, when there is no business day to count walking backwards (Sat 2024-01-06 given as laterDate, Sun 2024-01-07 as earlierDate)", () => {
			const result = differenceInBusinessDays(new Date(2024, 0, 6), new Date(2024, 0, 7));

			expect(result).toBe(0);
			expect(Object.is(result, -0)).toBe(false);
		});
	});

	describe("national holidays and year boundaries", () => {
		it("should count business days across a year boundary, skipping Ano novo (Mon 2024-12-30 to Fri 2025-01-03)", () => {
			expect(differenceInBusinessDays(new Date(2025, 0, 3), new Date(2024, 11, 30))).toBe(3);
		});
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), {
				stateCode: "SP",
			});

			expect(result).toBe(1);
		});

		it("should not skip that date when no options are provided", () => {
			expect(differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8))).toBe(2);
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			expect(differenceInBusinessDays(new Date(2024, 1, 14), new Date(2024, 1, 12))).toBe(1);
		});

		it("should count Carnaval 2024-02-13 as a business day when includeOptional is false", () => {
			const result = differenceInBusinessDays(new Date(2024, 1, 14), new Date(2024, 1, 12), {
				includeOptional: false,
			});

			expect(result).toBe(2);
		});
	});

	describe("invalid input", () => {
		it("should return null when called without arguments", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays()).toBeNull();
		});

		it("should return null when the later date is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays(null, new Date(2024, 0, 2))).toBeNull();
		});

		it("should return null when the later date is an invalid Date", () => {
			expect(differenceInBusinessDays(new Date("not a date"), new Date(2024, 0, 2))).toBeNull();
		});

		it("should return null when the earlier date is an invalid Date", () => {
			expect(differenceInBusinessDays(new Date(2024, 0, 2), new Date("not a date"))).toBeNull();
		});

		it("should return null when the later date is not a Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays("2024-01-03", new Date(2024, 0, 2))).toBeNull();
		});

		it("should return null when the earlier date is not a Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays(new Date(2024, 0, 3), "2024-01-02")).toBeNull();
		});

		it("should return null when the stateCode is not a string", () => {
			const result = differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2), {
				// @ts-expect-error: intentionally invalid input
				stateCode: 11,
			});

			expect(result).toBeNull();
		});

		it("should ignore options that are not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), "SP")).toBe(2);
		});

		it("should ignore a stateCode that is not a known state", () => {
			const result = differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2), {
				// @ts-expect-error: intentionally invalid input
				stateCode: "XX",
			});

			expect(result).toBe(1);
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				expect(
					differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2), {
						// @ts-expect-error: intentionally invalid input
						stateCode,
					}),
				).toBe(1);
			}
		});
	});

	inTimeZone("Pacific/Apia", () => {
		it("should count the 20 business days December 2011 has there, the missing 30th excluded", () => {
			expect(differenceInBusinessDays(new Date(2011, 11, 1), new Date(2011, 11, 31))).toBe(-20);
		});
	});

	inTimeZone("UTC", () => {
		it("should count 21 for the same December, where the 30th is an ordinary Friday", () => {
			expect(differenceInBusinessDays(new Date(2011, 11, 1), new Date(2011, 11, 31))).toBe(-21);
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		it("should count November 2018 across the summer time start of the 4th", () => {
			expect(differenceInBusinessDays(new Date(2018, 10, 30), new Date(2018, 10, 1))).toBe(19);
		});
	});

	describe("properties", () => {
		const amounts = fc.integer({ min: -100, max: 100 });

		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			// The walk visits every day between the two dates, so the dates that are dates stay inside a
			// few years: a pair a century apart is thousands of iterations per run, which is what the
			// other properties already cover and what made this one time out under mutation testing.
			const anyNearDate = fc.oneof(
				fc.date({ min: new Date(2020, 0, 1), max: new Date(2026, 11, 31), noInvalidDate: true }),
				fc.anything(),
			);

			expectNeverThrowsWithArguments(
				differenceInBusinessDays,
				fc.tuple(anyNearDate, anyNearDate, anyBusinessDayOptions),
			);
		});

		test("should return 0 for the same calendar day", () => {
			fc.assert(
				fc.property(businessDayDates, (date) => {
					expect(differenceInBusinessDays(date, date)).toBe(0);
				}),
			);
		});

		test("should undo addBusinessDays when starting from a business day", () => {
			fc.assert(
				fc.property(businessDayDates, amounts, (earlierDate, amount) => {
					if (!isBusinessDay(earlierDate)) return;

					const laterDate = addBusinessDays(earlierDate, amount);

					if (laterDate === null) return;

					expect(differenceInBusinessDays(laterDate, earlierDate)).toBe(amount);
				}),
			);
		});
	});
});

describe("differenceInBusinessDays types", () => {
	test("should take two Dates and optional BusinessDayOptions, and return a number or null", () => {
		expectTypeOf(differenceInBusinessDays).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(differenceInBusinessDays).parameter(1).toEqualTypeOf<Date>();
		expectTypeOf(differenceInBusinessDays)
			.parameter(2)
			.toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(differenceInBusinessDays).returns.toEqualTypeOf<number | null>();
	});
});
