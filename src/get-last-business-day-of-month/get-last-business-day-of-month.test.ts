import * as fc from "fast-check";

import {
	anyBusinessDayDate,
	anyBusinessDayOptions,
	businessDayDates,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, inTimeZone, it, test } from "../_internals/test/runtime";
import { addBusinessDays } from "../add-business-days/add-business-days";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";
import { getLastBusinessDayOfMonth } from "./get-last-business-day-of-month";

describe("getLastBusinessDayOfMonth", () => {
	it("should return the last day of the month when it is a business day (Wed 2024-01-31)", () => {
		expect(getLastBusinessDayOfMonth(new Date(2024, 0, 15))).toEqual(new Date(2024, 0, 31));
	});

	it("should walk back over a weekend (August 2024 ends on a Saturday -> Fri 2024-08-30)", () => {
		expect(getLastBusinessDayOfMonth(new Date(2024, 7, 1))).toEqual(new Date(2024, 7, 30));
	});

	it("should walk back over Sexta-feira Santa and the weekend after it (March 2024 -> Thu 2024-03-28)", () => {
		expect(getLastBusinessDayOfMonth(new Date(2024, 2, 1))).toEqual(new Date(2024, 2, 28));
	});

	it("should handle February in a leap year (Thu 2024-02-29) and in a common one (Tue 2023-02-28)", () => {
		expect(getLastBusinessDayOfMonth(new Date(2024, 1, 1))).toEqual(new Date(2024, 1, 29));
		expect(getLastBusinessDayOfMonth(new Date(2023, 1, 1))).toEqual(new Date(2023, 1, 28));
	});

	it("should return the start of the local day and leave the input untouched", () => {
		const input = new Date(2024, 7, 31, 18, 30, 15, 500);
		const result = getLastBusinessDayOfMonth(input);

		expect(result).toEqual(new Date(2024, 7, 30, 0, 0, 0, 0));
		expect(input).toEqual(new Date(2024, 7, 31, 18, 30, 15, 500));
	});

	describe("state holidays", () => {
		it("should walk back over a state holiday when stateCode is given (DF, Dia do Evangélico 2023-11-30)", () => {
			const result = getLastBusinessDayOfMonth(new Date(2023, 10, 1), { stateCode: "DF" });

			expect(result).toEqual(new Date(2023, 10, 29));
		});

		it("should land on that same holiday without a stateCode", () => {
			expect(getLastBusinessDayOfMonth(new Date(2023, 10, 1))).toEqual(new Date(2023, 10, 30));
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				// @ts-expect-error: intentionally invalid input
				expect(getLastBusinessDayOfMonth(new Date(2023, 10, 1), { stateCode })).toEqual(
					new Date(2023, 10, 30),
				);
			}
		});
	});

	describe("includeOptional", () => {
		it("should walk back over Corpus Christi 2018-05-31 by default (-> Wed 2018-05-30)", () => {
			expect(getLastBusinessDayOfMonth(new Date(2018, 4, 1))).toEqual(new Date(2018, 4, 30));
		});

		it("should land on Corpus Christi 2018-05-31 when includeOptional is false", () => {
			const result = getLastBusinessDayOfMonth(new Date(2018, 4, 1), { includeOptional: false });

			expect(result).toEqual(new Date(2018, 4, 31));
		});
	});

	describe("includeSaturday", () => {
		it("should return the Saturday August 2024 ends on when it counts (Sat 2024-08-31, Fri 2024-08-30 without the option)", () => {
			expect(getLastBusinessDayOfMonth(new Date(2024, 7, 1), { includeSaturday: true })).toEqual(
				new Date(2024, 7, 31),
			);
			expect(getLastBusinessDayOfMonth(new Date(2024, 7, 1), { includeSaturday: false })).toEqual(
				new Date(2024, 7, 30),
			);
		});

		it("should return Sat 2024-11-30 nationally, and Fri 2024-11-29 in the DF, where that Saturday is Dia do Evangélico", () => {
			expect(getLastBusinessDayOfMonth(new Date(2024, 10, 1), { includeSaturday: true })).toEqual(
				new Date(2024, 10, 30),
			);
			expect(
				getLastBusinessDayOfMonth(new Date(2024, 10, 1), {
					stateCode: "DF",
					includeSaturday: true,
				}),
			).toEqual(new Date(2024, 10, 29));
		});
	});

	describe("invalid input", () => {
		it("should return null for a date that is not a valid Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getLastBusinessDayOfMonth()).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getLastBusinessDayOfMonth(null)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getLastBusinessDayOfMonth("2024-01-15")).toBeNull();
			expect(getLastBusinessDayOfMonth(new Date("not a date"))).toBeNull();
		});

		it("should return null for a stateCode that is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getLastBusinessDayOfMonth(new Date(2024, 0, 15), { stateCode: 7 })).toBeNull();
		});

		it("should return null outside the supported years (1899 and 2100)", () => {
			expect(getLastBusinessDayOfMonth(new Date(1899, 11, 15))).toBeNull();
			expect(getLastBusinessDayOfMonth(new Date(2100, 0, 15))).toBeNull();
		});
	});

	inTimeZone("Pacific/Apia", () => {
		it("should answer for December 2011, whose 30th does not exist there (Thu 2011-12-29)", () => {
			expect(getLastBusinessDayOfMonth(new Date(2011, 11, 5))).toEqual(new Date(2011, 11, 29));
		});
	});

	inTimeZone("Asia/Beirut", () => {
		it("should start the day at 00:00 walking back over 31 March 2024, which has no midnight there (Thu 2024-03-28)", () => {
			const result = getLastBusinessDayOfMonth(new Date(2024, 2, 1));

			expect(result).toEqual(new Date(2024, 2, 28));
			expect(result?.getHours()).toBe(0);
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		it("should start the day at 00:00 during the summer time era (Fri 2018-11-30)", () => {
			const result = getLastBusinessDayOfMonth(new Date(2018, 10, 1));

			expect(result).toEqual(new Date(2018, 10, 30));
			expect(result?.getHours()).toBe(0);
		});
	});

	describe("properties", () => {
		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithOptions(
				getLastBusinessDayOfMonth,
				anyBusinessDayDate,
				anyBusinessDayOptions,
			);
		});

		test("should return a business day of the same month whose next business day is in another month", () => {
			fc.assert(
				fc.property(businessDayDates, (date) => {
					const result = getLastBusinessDayOfMonth(date);

					expect(result !== null && isBusinessDay(result)).toBe(true);
					expect([result?.getFullYear(), result?.getMonth()]).toEqual([
						date.getFullYear(),
						date.getMonth(),
					]);
					expect(result === null ? null : addBusinessDays(result, 1)?.getMonth()).toBe(
						(date.getMonth() + 1) % 12,
					);
				}),
			);
		});
	});
});

describe("getLastBusinessDayOfMonth types", () => {
	test("should take a Date and optional BusinessDayOptions, and return a Date or null", () => {
		expectTypeOf(getLastBusinessDayOfMonth).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(getLastBusinessDayOfMonth)
			.parameter(1)
			.toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(getLastBusinessDayOfMonth).returns.toEqualTypeOf<Date | null>();
	});
});
