import * as fc from "fast-check";

import {
	anyBusinessDayAmount,
	anyBusinessDayDate,
	anyBusinessDayOptions,
	businessDayDates,
	businessDayMonths,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithArguments } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, inTimeZone, it, test } from "../_internals/test/runtime";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";
import { addBusinessDays } from "./add-business-days";

describe("addBusinessDays", () => {
	it("should match the date-fns addBusinessDays example (10 business days from 2014-09-01 lands on 2014-09-15, https://date-fns.org/docs/addBusinessDays)", () => {
		const result = addBusinessDays(new Date(2014, 8, 1), 10);

		expect(result).toEqual(new Date(2014, 8, 15));
	});

	it("should skip a weekend when the very next day is a business day (Tue 2024-01-02 + 1 -> Wed 2024-01-03, noon)", () => {
		const result = addBusinessDays(new Date(2024, 0, 2, 12), 1);

		expect(result).toEqual(new Date(2024, 0, 3, 12));
	});

	it("should skip Saturday and Sunday to land on the next Monday (Fri 2024-01-05 + 1)", () => {
		const result = addBusinessDays(new Date(2024, 0, 5, 12), 1);

		expect(result).toEqual(new Date(2024, 0, 8, 12));
	});

	describe("supported years", () => {
		it("should return null when the date is outside 1900-2099 (Mon 2100-01-04)", () => {
			expect(addBusinessDays(new Date(2100, 0, 4, 12), 1)).toBeNull();
		});

		it("should return null when the walk leaves 2099 (Thu 2099-12-31 + 1) or 1900 (Tue 1900-01-02 - 1)", () => {
			expect(addBusinessDays(new Date(2099, 11, 31, 12), 1)).toBeNull();
			expect(addBusinessDays(new Date(1900, 0, 2, 12), -1)).toBeNull();
		});

		it("should return null instead of looping when the date is the maximum representable Date", () => {
			expect(addBusinessDays(new Date(8.64e15), 1)).toBeNull();
		});

		it("should accept the inclusive boundary years 1900 and 2099", () => {
			expect(addBusinessDays(new Date(1900, 0, 2), 0)).toEqual(new Date(1900, 0, 2));
			expect(addBusinessDays(new Date(2099, 0, 2), 0)).toEqual(new Date(2099, 0, 2));
		});

		it("should return null for a date outside the supported range even when the amount is 0", () => {
			expect(addBusinessDays(new Date(2150, 0, 1), 0)).toBeNull();
		});
	});

	describe("national holidays and year boundaries", () => {
		it("should skip Ano novo across a year boundary (2024-12-31 + 1 -> 2025-01-02)", () => {
			const result = addBusinessDays(new Date(2024, 11, 31, 12), 1);

			expect(result).toEqual(new Date(2025, 0, 2, 12));
		});

		it("should treat 2025-01-01 (Ano novo) as a holiday, not counted towards the business days", () => {
			const result = addBusinessDays(new Date(2024, 11, 30, 12), 2);

			expect(result).toEqual(new Date(2025, 0, 2, 12));
		});
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = addBusinessDays(new Date(2024, 6, 8, 12), 1, { stateCode: "SP" });

			expect(result).toEqual(new Date(2024, 6, 10, 12));
		});

		it("should not skip the same date when no options are provided", () => {
			const result = addBusinessDays(new Date(2024, 6, 8, 12), 1);

			expect(result).toEqual(new Date(2024, 6, 9, 12));
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			const result = addBusinessDays(new Date(2024, 1, 12, 12), 1);

			expect(result).toEqual(new Date(2024, 1, 14, 12));
		});

		it("should count Carnaval 2024-02-13 as a business day when includeOptional is false", () => {
			const result = addBusinessDays(new Date(2024, 1, 12, 12), 1, { includeOptional: false });

			expect(result).toEqual(new Date(2024, 1, 13, 12));
		});
	});

	describe("negative amounts", () => {
		it("should walk backwards, skipping weekends (Fri 2024-01-05 - 1 -> Thu 2024-01-04)", () => {
			const result = addBusinessDays(new Date(2024, 0, 5, 12), -1);

			expect(result).toEqual(new Date(2024, 0, 4, 12));
		});

		it("should walk backwards across a weekend (Mon 2024-01-08 - 1 -> Fri 2024-01-05)", () => {
			const result = addBusinessDays(new Date(2024, 0, 8, 12), -1);

			expect(result).toEqual(new Date(2024, 0, 5, 12));
		});
	});

	describe("an amount of 0", () => {
		it("should return a new Date equal to a business day input, unchanged", () => {
			const input = new Date(2024, 0, 2, 12);
			const result = addBusinessDays(input, 0);

			expect(result).toEqual(new Date(2024, 0, 2, 12));
			expect(result).not.toBe(input);
		});

		it("should return the same calendar day even when it is a Saturday, mirroring date-fns' addBusinessDays(date, 0) behavior of not rolling to the next business day", () => {
			const result = addBusinessDays(new Date(2024, 0, 6, 12), 0);

			expect(result).toEqual(new Date(2024, 0, 6, 12));
		});

		it("should return the same calendar day even when it is a holiday", () => {
			const result = addBusinessDays(new Date(2024, 0, 1, 12), 0);

			expect(result).toEqual(new Date(2024, 0, 1, 12));
		});
	});

	describe("invalid input", () => {
		it("should return null when the date is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(null, 1)).toBeNull();
		});

		it("should return null when called without arguments", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays()).toBeNull();
		});

		it("should return null when the date is an invalid Date", () => {
			expect(addBusinessDays(new Date("not a date"), 1)).toBeNull();
		});

		it("should return null when the date is not a Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays("2024-01-02", 1)).toBeNull();
		});

		it("should return null when the amount is not an integer", () => {
			expect(addBusinessDays(new Date(2024, 0, 2), 1.5)).toBeNull();
		});

		it("should return null when the amount is NaN", () => {
			expect(addBusinessDays(new Date(2024, 0, 2), Number.NaN)).toBeNull();
		});

		it("should return null when the amount is Infinity", () => {
			expect(addBusinessDays(new Date(2024, 0, 2), Number.POSITIVE_INFINITY)).toBeNull();
		});

		it("should return null when the amount is not a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(new Date(2024, 0, 2), "1")).toBeNull();
		});

		it("should return null when the stateCode is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(new Date(2024, 0, 2), 1, { stateCode: 123 })).toBeNull();
		});

		it("should return null when the stateCode is not a string even for an amount of 0, which walks no day", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(new Date(2024, 0, 2), 0, { stateCode: 123 })).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(new Date(2024, 0, 2), 0, { stateCode: null })).toBeNull();
		});

		it("should ignore options that are not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(new Date(2024, 6, 8, 12), 1, "SP")).toEqual(new Date(2024, 6, 9, 12));
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				expect(
					// @ts-expect-error: intentionally invalid input
					addBusinessDays(new Date(2024, 0, 2, 12), 1, { stateCode }),
				).toEqual(new Date(2024, 0, 3, 12));
			}
		});
	});

	it("should not mutate the input Date", () => {
		const input = new Date(2024, 0, 2, 12);
		const before = input.getTime();

		addBusinessDays(input, 5);

		expect(input.getTime()).toBe(before);
	});

	it("should preserve the time-of-day of the input", () => {
		const result = addBusinessDays(new Date(2024, 0, 2, 9, 30, 15, 500), 1);

		expect(result?.getHours()).toBe(9);
		expect(result?.getMinutes()).toBe(30);
		expect(result?.getSeconds()).toBe(15);
		expect(result?.getMilliseconds()).toBe(500);
	});

	inTimeZone("Pacific/Apia", () => {
		it("should walk back over 30 December 2011, the local day Samoa skipped to cross the date line", () => {
			expect(addBusinessDays(new Date(2012, 0, 5, 12), -4)).toEqual(new Date(2011, 11, 29, 12));
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		it("should keep the time-of-day across the summer time start of 4 November 2018", () => {
			const result = addBusinessDays(new Date(2018, 10, 1, 9, 30, 15, 500), 5);

			expect(result).toEqual(new Date(2018, 10, 9, 9, 30, 15, 500));
			expect(result?.getHours()).toBe(9);
		});
	});

	inTimeZone("Australia/Lord_Howe", () => {
		it("should keep the minutes across the half hour transition of 6 October 2024", () => {
			const result = addBusinessDays(new Date(2024, 9, 3, 2, 15), 2);

			expect(result).toEqual(new Date(2024, 9, 7, 2, 15));
			expect(result?.getMinutes()).toBe(15);
		});
	});

	describe("the n-th business day of a month, from the last day of the month before", () => {
		it("should give the 5th business day of January 2024 (Jan 1 is Ano novo): Mon 2024-01-08", () => {
			expect(addBusinessDays(new Date(2024, 0, 0), 5)).toEqual(new Date(2024, 0, 8));
		});

		it("should give the 1st business day when the 1st of the month is a holiday: Tue 2024-01-02", () => {
			expect(addBusinessDays(new Date(2024, 0, 0), 1)).toEqual(new Date(2024, 0, 2));
		});

		it("should skip Carnaval for the 10th business day of February 2024 (Thu 2024-02-15), and count it when includeOptional is false (Wed 2024-02-14)", () => {
			expect(addBusinessDays(new Date(2024, 1, 0), 10)).toEqual(new Date(2024, 1, 15));
			expect(addBusinessDays(new Date(2024, 1, 0), 10, { includeOptional: false })).toEqual(
				new Date(2024, 1, 14),
			);
		});

		it("should skip a state holiday for the 7th business day of July 2024 in SP (Wed 2024-07-10)", () => {
			expect(addBusinessDays(new Date(2024, 6, 0), 7, { stateCode: "SP" })).toEqual(
				new Date(2024, 6, 10),
			);
		});

		it("should spill into the next month when the month has fewer business days (January 2024 has 22, the 23rd is Thu 2024-02-01)", () => {
			expect(addBusinessDays(new Date(2024, 0, 0), 22)).toEqual(new Date(2024, 0, 31));
			expect(addBusinessDays(new Date(2024, 0, 0), 23)).toEqual(new Date(2024, 1, 1));
		});

		it("should return null for January 1900, whose day before is in 1899, outside the supported years", () => {
			expect(addBusinessDays(new Date(1900, 0, 0), 1)).toBeNull();
		});
	});

	describe("properties", () => {
		const amounts = fc.integer({ min: -200, max: 200 });

		test("should give the n-th business day of the month from the last day of the month before", () => {
			fc.assert(
				fc.property(
					businessDayMonths(),
					fc.integer({ min: 1, max: 23 }),
					({ year, month, businessDays }, n) => {
						const result = addBusinessDays(new Date(year, month, 0), n);

						if (n <= businessDays.length) {
							expect(result).toEqual(businessDays[n - 1]);
						} else {
							expect(result?.getMonth()).toBe((month + 1) % 12);
						}
					},
				),
			);
		});

		test("should give the last business day of the month, walking back 1 from the first day of the month after", () => {
			fc.assert(
				fc.property(businessDayMonths(), ({ year, month, businessDays }) => {
					expect(addBusinessDays(new Date(year, month + 1, 1), -1)).toEqual(businessDays.at(-1));
				}),
			);
		});

		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithArguments(
				addBusinessDays,
				fc.tuple(anyBusinessDayDate, anyBusinessDayAmount, anyBusinessDayOptions),
			);
		});

		test("should land on a business day whenever a non-zero amount is requested", () => {
			fc.assert(
				fc.property(businessDayDates, amounts, (date, amount) => {
					if (amount === 0) return;

					const result = addBusinessDays(date, amount);

					if (result !== null) {
						expect(isBusinessDay(result)).toBe(true);
					}
				}),
			);
		});

		test("should move the date forward for a positive amount and backward for a negative one", () => {
			fc.assert(
				fc.property(businessDayDates, amounts, (date, amount) => {
					const result = addBusinessDays(date, amount);

					if (result === null) return;

					if (amount > 0) {
						expect(result.getTime()).toBeGreaterThan(date.getTime());
					} else if (amount < 0) {
						expect(result.getTime()).toBeLessThan(date.getTime());
					} else {
						expect(result.getTime()).toBe(date.getTime());
					}
				}),
			);
		});
	});
});

describe("addBusinessDays types", () => {
	test("should take a Date, a number and optional BusinessDayOptions, and return a Date or null", () => {
		expectTypeOf(addBusinessDays).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(addBusinessDays).parameter(1).toEqualTypeOf<number>();
		expectTypeOf(addBusinessDays).parameter(2).toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(addBusinessDays).returns.toEqualTypeOf<Date | null>();
	});
});
