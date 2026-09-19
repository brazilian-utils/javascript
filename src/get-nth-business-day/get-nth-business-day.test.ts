import * as fc from "fast-check";

import {
	anyBusinessDayAmount,
	anyBusinessDayDate,
	anyBusinessDayOptions,
	businessDayDates,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithArguments } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, inTimeZone, it, test } from "../_internals/test/runtime";
import { differenceInBusinessDays } from "../difference-in-business-days/difference-in-business-days";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";
import { getNthBusinessDay } from "./get-nth-business-day";

const yearFifty = new Date(2024, 0, 15);
yearFifty.setFullYear(50);

const NULL_CALLS: [string, () => Date | null][] = [
	// @ts-expect-error: intentionally invalid input
	["no arguments at all", () => getNthBusinessDay()],
	// @ts-expect-error: intentionally invalid input
	["a null date", () => getNthBusinessDay(null, 1)],
	["an invalid Date", () => getNthBusinessDay(new Date("not a date"), 1)],
	// @ts-expect-error: intentionally invalid input
	["a date given as a string", () => getNthBusinessDay("2024-01-15", 1)],
	["an n of 0", () => getNthBusinessDay(new Date(2024, 0, 15), 0)],
	["an n with a fractional part", () => getNthBusinessDay(new Date(2024, 0, 15), 1.5)],
	["an n of NaN", () => getNthBusinessDay(new Date(2024, 0, 15), Number.NaN)],
	["an n of Infinity", () => getNthBusinessDay(new Date(2024, 0, 15), Number.POSITIVE_INFINITY)],
	// @ts-expect-error: intentionally invalid input
	["an n given as a numeric string", () => getNthBusinessDay(new Date(2024, 0, 15), "1")],
	// @ts-expect-error: intentionally invalid input
	["an n given as null", () => getNthBusinessDay(new Date(2024, 0, 15), null)],
	[
		"a stateCode that is not a string",
		// @ts-expect-error: intentionally invalid input
		() => getNthBusinessDay(new Date(2024, 0, 15), 1, { stateCode: 7 }),
	],
	["a date before the supported years", () => getNthBusinessDay(new Date(1899, 11, 15), 1)],
	["a date after the supported years", () => getNthBusinessDay(new Date(2100, 0, 15), 1)],
	[
		"a date in the year 50, which the Date constructor would read as 1950",
		() => getNthBusinessDay(yearFifty, 1),
	],
];

describe("getNthBusinessDay", () => {
	it("should skip Ano novo to find the first business day of January 2024 (Tue 2024-01-02)", () => {
		expect(getNthBusinessDay(new Date(2024, 0, 15), 1)).toEqual(new Date(2024, 0, 2));
	});

	it("should return the first day of the month when it is a business day (Thu 2024-02-01)", () => {
		expect(getNthBusinessDay(new Date(2024, 1, 20), 1)).toEqual(new Date(2024, 1, 1));
	});

	it("should skip a weekend to find the 5th business day of January 2024 (Mon 2024-01-08)", () => {
		expect(getNthBusinessDay(new Date(2024, 0, 15), 5)).toEqual(new Date(2024, 0, 8));
	});

	it("should find the 5th business day of November 2024, after Finados on a Saturday (Thu 2024-11-07)", () => {
		expect(getNthBusinessDay(new Date(2024, 10, 1), 5)).toEqual(new Date(2024, 10, 7));
	});

	it("should reach the last business day of the month going forwards (22nd of January 2024 -> Wed 2024-01-31)", () => {
		expect(getNthBusinessDay(new Date(2024, 0, 15), 22)).toEqual(new Date(2024, 0, 31));
	});

	it("should return null when the month has fewer business days than n (January 2024 has 22)", () => {
		expect(getNthBusinessDay(new Date(2024, 0, 15), 23)).toBeNull();
		expect(getNthBusinessDay(new Date(2024, 0, 15), 1000)).toBeNull();
	});

	it("should look at the month of the date whatever its day, first and last included", () => {
		expect(getNthBusinessDay(new Date(2024, 0, 1), 5)).toEqual(new Date(2024, 0, 8));
		expect(getNthBusinessDay(new Date(2024, 0, 31, 23, 59, 59, 999), 5)).toEqual(
			new Date(2024, 0, 8),
		);
	});

	it("should return the start of the local day and leave the input untouched", () => {
		const input = new Date(2024, 0, 15, 9, 30, 15, 500);
		const result = getNthBusinessDay(input, 5);

		expect(result).toEqual(new Date(2024, 0, 8, 0, 0, 0, 0));
		expect(input).toEqual(new Date(2024, 0, 15, 9, 30, 15, 500));
	});

	it("should return a new Date even when the answer is the input day", () => {
		const input = new Date(2024, 0, 8);
		const result = getNthBusinessDay(input, 5);

		expect(result).toEqual(new Date(2024, 0, 8));
		expect(result).not.toBe(input);
	});

	it("should work at both ends of the supported years (Tue 1900-01-02 and Thu 2099-12-31)", () => {
		expect(getNthBusinessDay(new Date(1900, 0, 15), 1)).toEqual(new Date(1900, 0, 2));
		expect(getNthBusinessDay(new Date(2099, 11, 15), -1)).toEqual(new Date(2099, 11, 31));
	});

	it("should return null for every kind of invalid input", () => {
		for (const [label, call] of NULL_CALLS) {
			expect([label, call()]).toEqual([label, null]);
		}
	});

	describe("negative n", () => {
		it("should count from the end of the month (-1 -> Wed 2024-01-31, -2 -> Tue 2024-01-30)", () => {
			expect(getNthBusinessDay(new Date(2024, 0, 15), -1)).toEqual(new Date(2024, 0, 31));
			expect(getNthBusinessDay(new Date(2024, 0, 15), -2)).toEqual(new Date(2024, 0, 30));
		});

		it("should skip a weekend at the end of the month (-1 of August 2024 -> Fri 2024-08-30)", () => {
			expect(getNthBusinessDay(new Date(2024, 7, 1), -1)).toEqual(new Date(2024, 7, 30));
		});

		it("should handle December, whose last day borders the next year (-1 of December 2024 -> Tue 2024-12-31)", () => {
			expect(getNthBusinessDay(new Date(2024, 11, 1), -1)).toEqual(new Date(2024, 11, 31));
		});

		it("should reach the first business day of the month going backwards (-22 of January 2024 -> Tue 2024-01-02)", () => {
			expect(getNthBusinessDay(new Date(2024, 0, 15), -22)).toEqual(new Date(2024, 0, 2));
		});

		it("should return null instead of spilling into the previous month (-23 of January 2024)", () => {
			expect(getNthBusinessDay(new Date(2024, 0, 15), -23)).toBeNull();
		});
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is given (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = getNthBusinessDay(new Date(2024, 6, 1), 7, { stateCode: "SP" });

			expect(result).toEqual(new Date(2024, 6, 10));
		});

		it("should count that same holiday without a stateCode", () => {
			expect(getNthBusinessDay(new Date(2024, 6, 1), 7)).toEqual(new Date(2024, 6, 9));
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				// @ts-expect-error: intentionally invalid input
				expect(getNthBusinessDay(new Date(2024, 6, 1), 7, { stateCode })).toEqual(
					new Date(2024, 6, 9),
				);
			}
		});

		it("should ignore options that are not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNthBusinessDay(new Date(2024, 6, 1), 7, "SP")).toEqual(new Date(2024, 6, 9));
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (10th of February 2024 -> Thu 2024-02-15)", () => {
			expect(getNthBusinessDay(new Date(2024, 1, 1), 10)).toEqual(new Date(2024, 1, 15));
		});

		it("should count Carnaval 2024-02-13 when includeOptional is false (-> Wed 2024-02-14)", () => {
			const result = getNthBusinessDay(new Date(2024, 1, 1), 10, { includeOptional: false });

			expect(result).toEqual(new Date(2024, 1, 14));
		});
	});

	inTimeZone("Pacific/Apia", () => {
		it("should count the 21 business days December 2011 has there, the missing 30th excluded", () => {
			expect(getNthBusinessDay(new Date(2011, 11, 15), 21)).toEqual(new Date(2011, 11, 29));
			expect(getNthBusinessDay(new Date(2011, 11, 15), 22)).toBeNull();
			expect(getNthBusinessDay(new Date(2011, 11, 15), -1)).toEqual(new Date(2011, 11, 29));
		});

		it("should step over the missing Friday 30th with includeSaturday too (-1 is Sat 2011-12-31, -2 is Thu 2011-12-29)", () => {
			const options = { includeSaturday: true };

			expect(getNthBusinessDay(new Date(2011, 11, 15), -1, options)).toEqual(
				new Date(2011, 11, 31),
			);
			expect(getNthBusinessDay(new Date(2011, 11, 15), -2, options)).toEqual(
				new Date(2011, 11, 29),
			);
			expect(getNthBusinessDay(new Date(2011, 11, 15), 26, options)).toEqual(
				new Date(2011, 11, 31),
			);
			expect(getNthBusinessDay(new Date(2011, 11, 15), 27, options)).toBeNull();
		});
	});

	inTimeZone("UTC", () => {
		it("should count the 22 the same December has, the 30th included", () => {
			expect(getNthBusinessDay(new Date(2011, 11, 15), 22)).toEqual(new Date(2011, 11, 30));
			expect(getNthBusinessDay(new Date(2011, 11, 15), 23)).toBeNull();
		});

		it("should count the 27 the same December has with includeSaturday (-2 is Fri 2011-12-30)", () => {
			const options = { includeSaturday: true };

			expect(getNthBusinessDay(new Date(2011, 11, 15), -2, options)).toEqual(
				new Date(2011, 11, 30),
			);
			expect(getNthBusinessDay(new Date(2011, 11, 15), 27, options)).toEqual(
				new Date(2011, 11, 31),
			);
		});
	});

	inTimeZone("America/Havana", () => {
		it("should start the day at 00:00 walking back over 10 March 2024, which has no midnight there (Tue 2024-03-05)", () => {
			const result = getNthBusinessDay(new Date(2024, 2, 15), -18);

			expect(result).toEqual(new Date(2024, 2, 5));
			expect(result?.getHours()).toBe(0);
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		it("should start the day at 00:00 during the summer time era (Thu 2018-11-08)", () => {
			const result = getNthBusinessDay(new Date(2018, 10, 1), 5);

			expect(result).toEqual(new Date(2018, 10, 8));
			expect(result?.getHours()).toBe(0);
		});

		it("should fall back to 01:00 on Monday 6 October 1997, whose local midnight does not exist", () => {
			const result = getNthBusinessDay(new Date(1997, 9, 15), 4);

			expect(result).toEqual(new Date(1997, 9, 6));
			expect(result?.getDate()).toBe(6);
			expect(result?.getHours()).toBe(1);
		});
	});

	describe("includeSaturday", () => {
		it("should give the labour law fifth business day of March 2024 (Wed 2024-03-06, Sat 2024-03-02 counted) against the banking one (Thu 2024-03-07)", () => {
			expect(getNthBusinessDay(new Date(2024, 2, 1), 5, { includeSaturday: true })).toEqual(
				new Date(2024, 2, 6),
			);
			expect(getNthBusinessDay(new Date(2024, 2, 1), 5)).toEqual(new Date(2024, 2, 7));
		});

		it("should give the labour law fifth business day of February 2024 (Tue 2024-02-06, Sat 2024-02-03 counted) against the banking one (Wed 2024-02-07)", () => {
			expect(getNthBusinessDay(new Date(2024, 1, 1), 5, { includeSaturday: true })).toEqual(
				new Date(2024, 1, 6),
			);
			expect(getNthBusinessDay(new Date(2024, 1, 1), 5)).toEqual(new Date(2024, 1, 7));
		});

		it("should give the same fifth business day of November 2024 either way (Thu 2024-11-07), since Sat 2024-11-02 is Finados", () => {
			expect(getNthBusinessDay(new Date(2024, 10, 1), 5, { includeSaturday: true })).toEqual(
				new Date(2024, 10, 7),
			);
			expect(getNthBusinessDay(new Date(2024, 10, 1), 5)).toEqual(new Date(2024, 10, 7));
		});

		it("should skip Independência on Saturday 2024-09-07 and count Sat 2024-09-14 as the 11th (Mon 2024-09-16 without the option)", () => {
			expect(getNthBusinessDay(new Date(2024, 8, 1), 11, { includeSaturday: true })).toEqual(
				new Date(2024, 8, 14),
			);
			expect(getNthBusinessDay(new Date(2024, 8, 1), 11)).toEqual(new Date(2024, 8, 16));
		});

		it("should give January 2024 its 26 business days (22 plus the Saturdays 6, 13, 20 and 27), the 26th being Wed 2024-01-31", () => {
			expect(getNthBusinessDay(new Date(2024, 0, 15), 26, { includeSaturday: true })).toEqual(
				new Date(2024, 0, 31),
			);
			expect(getNthBusinessDay(new Date(2024, 0, 15), 27, { includeSaturday: true })).toBeNull();
			expect(getNthBusinessDay(new Date(2024, 0, 15), 23)).toBeNull();
		});

		it("should count backwards from a Saturday at the end of the month (-1 of November 2024 -> Sat 2024-11-30, Fri 2024-11-29 without the option)", () => {
			expect(getNthBusinessDay(new Date(2024, 10, 15), -1, { includeSaturday: true })).toEqual(
				new Date(2024, 10, 30),
			);
			expect(getNthBusinessDay(new Date(2024, 10, 15), -1)).toEqual(new Date(2024, 10, 29));
		});

		it("should still exclude that Saturday when it is a state holiday (DF, Dia do Evangélico 2024-11-30)", () => {
			const result = getNthBusinessDay(new Date(2024, 10, 15), -1, {
				stateCode: "DF",
				includeSaturday: true,
			});

			expect(result).toEqual(new Date(2024, 10, 29));
		});
	});

	describe("properties", () => {
		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithArguments(
				getNthBusinessDay,
				fc.tuple(anyBusinessDayDate, anyBusinessDayAmount, anyBusinessDayOptions),
			);
		});

		test("should return a business day of the same month with n - 1 business days before it", () => {
			fc.assert(
				fc.property(businessDayDates, fc.integer({ min: 1, max: 15 }), (date, n) => {
					const result = getNthBusinessDay(date, n);
					const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

					expect(result?.getFullYear()).toBe(date.getFullYear());
					expect(result?.getMonth()).toBe(date.getMonth());
					expect(result !== null && isBusinessDay(result)).toBe(true);
					expect(result === null ? null : differenceInBusinessDays(result, firstOfMonth)).toBe(
						n - 1,
					);
				}),
			);
		});
	});
});

describe("getNthBusinessDay types", () => {
	test("should take a Date, a number and optional BusinessDayOptions, and return a Date or null", () => {
		expectTypeOf(getNthBusinessDay).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(getNthBusinessDay).parameter(1).toEqualTypeOf<number>();
		expectTypeOf(getNthBusinessDay).parameter(2).toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(getNthBusinessDay).returns.toEqualTypeOf<Date | null>();
	});
});
