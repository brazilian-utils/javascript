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
import { addBusinessDays } from "../add-business-days/add-business-days";
import { type BusinessDayOptions } from "../is-business-day/is-business-day";
import { subBusinessDays } from "./sub-business-days";

const NULL_CALLS: [string, () => Date | null][] = [
	// @ts-expect-error: intentionally invalid input
	["no arguments at all", () => subBusinessDays()],
	// @ts-expect-error: intentionally invalid input
	["a null date", () => subBusinessDays(null, 1)],
	["an invalid Date", () => subBusinessDays(new Date("not a date"), 1)],
	// @ts-expect-error: intentionally invalid input
	["a date given as a string", () => subBusinessDays("2024-01-05", 1)],
	["an amount with a fractional part", () => subBusinessDays(new Date(2024, 0, 5), 1.5)],
	["an amount of NaN", () => subBusinessDays(new Date(2024, 0, 5), Number.NaN)],
	["an amount of -Infinity", () => subBusinessDays(new Date(2024, 0, 5), Number.NEGATIVE_INFINITY)],
	// @ts-expect-error: intentionally invalid input
	["an amount given as a numeric string", () => subBusinessDays(new Date(2024, 0, 5), "1")],
	// @ts-expect-error: intentionally invalid input
	["an amount given as null", () => subBusinessDays(new Date(2024, 0, 5), null)],
	[
		"a stateCode that is not a string",
		// @ts-expect-error: intentionally invalid input
		() => subBusinessDays(new Date(2024, 0, 5), 1, { stateCode: 7 }),
	],
	["a date before the supported years", () => subBusinessDays(new Date(1899, 11, 29), 1)],
	["a walk that leaves 1900", () => subBusinessDays(new Date(1900, 0, 2, 12), 1)],
	["a walk that leaves 2099", () => subBusinessDays(new Date(2099, 11, 31, 12), -1)],
];

describe("subBusinessDays", () => {
	it("should step back to the previous day when it is already a business day (Fri 2024-01-05 - 1 -> Thu 2024-01-04, noon)", () => {
		expect(subBusinessDays(new Date(2024, 0, 5, 12), 1)).toEqual(new Date(2024, 0, 4, 12));
	});

	it("should walk back over Saturday and Sunday (Mon 2024-01-08 - 1 -> Fri 2024-01-05)", () => {
		expect(subBusinessDays(new Date(2024, 0, 8, 12), 1)).toEqual(new Date(2024, 0, 5, 12));
	});

	it("should walk back over Ano novo and a year boundary (Thu 2025-01-02 - 1 -> Tue 2024-12-31)", () => {
		expect(subBusinessDays(new Date(2025, 0, 2, 12), 1)).toEqual(new Date(2024, 11, 31, 12));
	});

	it("should count several business days back at once (Fri 2024-01-12 - 5 -> Fri 2024-01-05)", () => {
		expect(subBusinessDays(new Date(2024, 0, 12, 12), 5)).toEqual(new Date(2024, 0, 5, 12));
	});

	it("should walk forwards for a negative amount (Fri 2024-01-05 - -1 -> Mon 2024-01-08)", () => {
		expect(subBusinessDays(new Date(2024, 0, 5, 12), -1)).toEqual(new Date(2024, 0, 8, 12));
	});

	it("should return a new Date equal to the input for an amount of 0, weekend or not", () => {
		const saturday = new Date(2024, 0, 6, 12);
		const result = subBusinessDays(saturday, 0);

		expect(result).toEqual(new Date(2024, 0, 6, 12));
		expect(result).not.toBe(saturday);
	});

	it("should keep the time-of-day of the input and leave the input untouched", () => {
		const input = new Date(2024, 0, 5, 9, 30, 15, 500);
		const result = subBusinessDays(input, 1);

		expect(result).toEqual(new Date(2024, 0, 4, 9, 30, 15, 500));
		expect(input).toEqual(new Date(2024, 0, 5, 9, 30, 15, 500));
	});

	describe("state holidays", () => {
		it("should walk back over a state holiday when stateCode is given (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = subBusinessDays(new Date(2024, 6, 10, 12), 1, { stateCode: "SP" });

			expect(result).toEqual(new Date(2024, 6, 8, 12));
		});

		it("should land on that same holiday without a stateCode", () => {
			expect(subBusinessDays(new Date(2024, 6, 10, 12), 1)).toEqual(new Date(2024, 6, 9, 12));
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				// @ts-expect-error: intentionally invalid input
				expect(subBusinessDays(new Date(2024, 0, 5, 12), 1, { stateCode })).toEqual(
					new Date(2024, 0, 4, 12),
				);
			}
		});

		it("should ignore options that are not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(subBusinessDays(new Date(2024, 6, 10, 12), 1, "SP")).toEqual(new Date(2024, 6, 9, 12));
		});
	});

	describe("includeOptional", () => {
		it("should walk back over Carnaval 2024-02-13 by default (Wed 2024-02-14 - 1 -> Mon 2024-02-12)", () => {
			expect(subBusinessDays(new Date(2024, 1, 14, 12), 1)).toEqual(new Date(2024, 1, 12, 12));
		});

		it("should stop on Carnaval 2024-02-13 when includeOptional is false", () => {
			const result = subBusinessDays(new Date(2024, 1, 14, 12), 1, { includeOptional: false });

			expect(result).toEqual(new Date(2024, 1, 13, 12));
		});
	});

	describe("invalid input", () => {
		for (const [label, call] of NULL_CALLS) {
			it(`should return null for ${label}`, () => {
				expect(call()).toBeNull();
			});
		}
	});

	inTimeZone("Pacific/Apia", () => {
		it("should walk back over 30 December 2011, the local day Samoa skipped to cross the date line", () => {
			expect(subBusinessDays(new Date(2012, 0, 5, 12), 4)).toEqual(new Date(2011, 11, 29, 12));
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		it("should keep the time-of-day across the summer time start of 4 November 2018", () => {
			expect(subBusinessDays(new Date(2018, 10, 9, 9, 30), 5)).toEqual(
				new Date(2018, 10, 1, 9, 30),
			);
		});
	});

	describe("properties", () => {
		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithArguments(
				subBusinessDays,
				fc.tuple(anyBusinessDayDate, anyBusinessDayAmount, anyBusinessDayOptions),
			);
		});

		test("should be addBusinessDays with the opposite amount", () => {
			fc.assert(
				fc.property(businessDayDates, fc.integer({ min: -200, max: 200 }), (date, amount) => {
					expect(subBusinessDays(date, amount)).toEqual(addBusinessDays(date, -amount));
				}),
			);
		});
	});
});

describe("subBusinessDays types", () => {
	test("should take a Date, a number and optional BusinessDayOptions, and return a Date or null", () => {
		expectTypeOf(subBusinessDays).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(subBusinessDays).parameter(1).toEqualTypeOf<number>();
		expectTypeOf(subBusinessDays).parameter(2).toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(subBusinessDays).returns.toEqualTypeOf<Date | null>();
	});
});
