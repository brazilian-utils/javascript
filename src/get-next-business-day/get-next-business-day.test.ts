import * as fc from "fast-check";

import {
	anyBusinessDayDate,
	anyBusinessDayOptions,
	businessDayDates,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, inTimeZone, it, test } from "../_internals/test/runtime";
import { differenceInBusinessDays } from "../difference-in-business-days/difference-in-business-days";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";
import { getNextBusinessDay } from "./get-next-business-day";

describe("getNextBusinessDay", () => {
	it("should be strictly after a date that is itself a business day (Tue 2024-01-02 -> Wed 2024-01-03, noon)", () => {
		expect(getNextBusinessDay(new Date(2024, 0, 2, 12))).toEqual(new Date(2024, 0, 3, 12));
	});

	it("should keep the time-of-day of the input and leave the input untouched", () => {
		const input = new Date(2024, 0, 5, 9, 30, 15, 500);
		const result = getNextBusinessDay(input);

		expect(result).toEqual(new Date(2024, 0, 8, 9, 30, 15, 500));
		expect(input).toEqual(new Date(2024, 0, 5, 9, 30, 15, 500));
	});

	it("should skip Saturday and Sunday from a Friday (Fri 2024-01-05 -> Mon 2024-01-08)", () => {
		expect(getNextBusinessDay(new Date(2024, 0, 5, 12))).toEqual(new Date(2024, 0, 8, 12));
	});

	it("should land on the same Monday from a Saturday and from a Sunday", () => {
		expect(getNextBusinessDay(new Date(2024, 0, 6, 12))).toEqual(new Date(2024, 0, 8, 12));
		expect(getNextBusinessDay(new Date(2024, 0, 7, 12))).toEqual(new Date(2024, 0, 8, 12));
	});

	it("should skip Ano novo across a year boundary (Tue 2024-12-31 -> Thu 2025-01-02)", () => {
		expect(getNextBusinessDay(new Date(2024, 11, 31, 12))).toEqual(new Date(2025, 0, 2, 12));
	});

	it("should start from a holiday like from any other day (Mon 2024-01-01 -> Tue 2024-01-02)", () => {
		expect(getNextBusinessDay(new Date(2024, 0, 1, 12))).toEqual(new Date(2024, 0, 2, 12));
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is given (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = getNextBusinessDay(new Date(2024, 6, 8, 12), { stateCode: "SP" });

			expect(result).toEqual(new Date(2024, 6, 10, 12));
		});

		it("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
			for (const stateCode of PROTOTYPE_KEYS) {
				// @ts-expect-error: intentionally invalid input
				const result = getNextBusinessDay(new Date(2024, 6, 8, 12), { stateCode });

				expect(result).toEqual(new Date(2024, 6, 9, 12));
			}
		});

		it("should land on that same holiday without a stateCode", () => {
			expect(getNextBusinessDay(new Date(2024, 6, 8, 12))).toEqual(new Date(2024, 6, 9, 12));
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (Mon 2024-02-12 -> Wed 2024-02-14)", () => {
			expect(getNextBusinessDay(new Date(2024, 1, 12, 12))).toEqual(new Date(2024, 1, 14, 12));
		});

		it("should land on Carnaval 2024-02-13 when includeOptional is false", () => {
			const result = getNextBusinessDay(new Date(2024, 1, 12, 12), { includeOptional: false });

			expect(result).toEqual(new Date(2024, 1, 13, 12));
		});
	});

	describe("includeSaturday", () => {
		it("should return the Saturday when it counts (Fri 2024-01-05 -> Sat 2024-01-06)", () => {
			const result = getNextBusinessDay(new Date(2024, 0, 5, 12), { includeSaturday: true });

			expect(result).toEqual(new Date(2024, 0, 6, 12));
		});

		it("should return the Monday without the option (Fri 2024-01-05 -> Mon 2024-01-08)", () => {
			expect(getNextBusinessDay(new Date(2024, 0, 5, 12), { includeSaturday: false })).toEqual(
				new Date(2024, 0, 8, 12),
			);
		});

		it("should never return a Sunday (Sat 2024-01-06 -> Mon 2024-01-08)", () => {
			const result = getNextBusinessDay(new Date(2024, 0, 6, 12), { includeSaturday: true });

			expect(result).toEqual(new Date(2024, 0, 8, 12));
		});

		it("should skip a holiday that falls on a Saturday (Fri 2024-11-01 -> Mon 2024-11-04, Finados)", () => {
			const result = getNextBusinessDay(new Date(2024, 10, 1, 12), { includeSaturday: true });

			expect(result).toEqual(new Date(2024, 10, 4, 12));
		});
	});

	describe("invalid input", () => {
		it("should return null for a date that is not a valid Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNextBusinessDay()).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getNextBusinessDay(null)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getNextBusinessDay("2024-01-05")).toBeNull();
			expect(getNextBusinessDay(new Date("not a date"))).toBeNull();
		});

		it("should return null for a stateCode that is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNextBusinessDay(new Date(2024, 0, 5), { stateCode: 7 })).toBeNull();
		});

		it("should return null outside the supported years, or when the walk leaves them (Thu 2099-12-31)", () => {
			expect(getNextBusinessDay(new Date(1899, 11, 29))).toBeNull();
			expect(getNextBusinessDay(new Date(2100, 0, 4))).toBeNull();
			expect(getNextBusinessDay(new Date(2099, 11, 31, 12))).toBeNull();
		});
	});

	inTimeZone("Pacific/Apia", () => {
		it("should skip 30 December 2011, the local day Samoa never had (-> Mon 2012-01-02)", () => {
			expect(getNextBusinessDay(new Date(2011, 11, 29, 12))).toEqual(new Date(2012, 0, 2, 12));
		});
	});

	inTimeZone("UTC", () => {
		it("should reach 30 December 2011, where it is an ordinary Friday", () => {
			expect(getNextBusinessDay(new Date(2011, 11, 29, 12))).toEqual(new Date(2011, 11, 30, 12));
		});
	});

	describe("properties", () => {
		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			expectNeverThrowsWithOptions(getNextBusinessDay, anyBusinessDayDate, anyBusinessDayOptions);
		});

		test("should return a business day after the date with no business day strictly in between", () => {
			fc.assert(
				fc.property(businessDayDates, (date) => {
					const result = getNextBusinessDay(date);
					const dayAfter = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

					expect(result !== null && isBusinessDay(result)).toBe(true);
					expect(result !== null && result.getTime() > date.getTime()).toBe(true);
					expect(result === null ? null : differenceInBusinessDays(result, dayAfter)).toBe(0);
				}),
			);
		});
	});
});

describe("getNextBusinessDay types", () => {
	test("should take a Date and optional BusinessDayOptions, and return a Date or null", () => {
		expectTypeOf(getNextBusinessDay).parameter(0).toEqualTypeOf<Date>();
		expectTypeOf(getNextBusinessDay).parameter(1).toEqualTypeOf<BusinessDayOptions | undefined>();
		expectTypeOf(getNextBusinessDay).returns.toEqualTypeOf<Date | null>();
	});
});
