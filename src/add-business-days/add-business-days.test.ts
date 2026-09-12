import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import { businessDayDates } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isBusinessDay } from "../is-business-day/is-business-day";
import { addBusinessDays, type AddBusinessDaysParams } from "./add-business-days";

describe("addBusinessDays", () => {
	it("should match the date-fns addBusinessDays example (10 business days from 2014-09-01 lands on 2014-09-15, https://date-fns.org/docs/addBusinessDays)", () => {
		const result = addBusinessDays({ date: new Date(2014, 8, 1), days: 10 });

		expect(result).toEqual(new Date(2014, 8, 15));
	});

	it("should skip a weekend when the very next day is a business day (Tue 2024-01-02 + 1 -> Wed 2024-01-03, noon)", () => {
		const result = addBusinessDays({ date: new Date(2024, 0, 2, 12), days: 1 });

		expect(result).toEqual(new Date(2024, 0, 3, 12));
	});

	it("should skip Saturday and Sunday to land on the next Monday (Fri 2024-01-05 + 1)", () => {
		const result = addBusinessDays({ date: new Date(2024, 0, 5, 12), days: 1 });

		expect(result).toEqual(new Date(2024, 0, 8, 12));
	});

	describe("supported years", () => {
		it("should return null when the date is outside 1900-2099 (Mon 2100-01-04)", () => {
			expect(addBusinessDays({ date: new Date(2100, 0, 4, 12), days: 1 })).toBeNull();
		});

		it("should return null when the walk leaves 2099 (Thu 2099-12-31 + 1) or 1900 (Tue 1900-01-02 - 1)", () => {
			expect(addBusinessDays({ date: new Date(2099, 11, 31, 12), days: 1 })).toBeNull();
			expect(addBusinessDays({ date: new Date(1900, 0, 2, 12), days: -1 })).toBeNull();
		});

		it("should return null instead of looping when the date is the maximum representable Date", () => {
			expect(addBusinessDays({ date: new Date(8.64e15), days: 1 })).toBeNull();
		});

		it("should accept the inclusive boundary years 1900 and 2099", () => {
			expect(addBusinessDays({ date: new Date(1900, 0, 2), days: 0 })).toEqual(
				new Date(1900, 0, 2),
			);
			expect(addBusinessDays({ date: new Date(2099, 0, 2), days: 0 })).toEqual(
				new Date(2099, 0, 2),
			);
		});

		it("should return null for a date outside the supported range even when days is 0", () => {
			expect(addBusinessDays({ date: new Date(2150, 0, 1), days: 0 })).toBeNull();
		});
	});

	describe("national holidays and year boundaries", () => {
		it("should skip Ano novo across a year boundary (2024-12-31 + 1 -> 2025-01-02)", () => {
			const result = addBusinessDays({ date: new Date(2024, 11, 31, 12), days: 1 });

			expect(result).toEqual(new Date(2025, 0, 2, 12));
		});

		it("should treat 2025-01-01 (Ano novo) as a holiday, not counted towards the business days", () => {
			const result = addBusinessDays({ date: new Date(2024, 11, 30, 12), days: 2 });

			expect(result).toEqual(new Date(2025, 0, 2, 12));
		});
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = addBusinessDays({ date: new Date(2024, 6, 8, 12), days: 1, stateCode: "SP" });

			expect(result).toEqual(new Date(2024, 6, 10, 12));
		});

		it("should not skip the same date when stateCode is not provided", () => {
			const result = addBusinessDays({ date: new Date(2024, 6, 8, 12), days: 1 });

			expect(result).toEqual(new Date(2024, 6, 9, 12));
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			const result = addBusinessDays({ date: new Date(2024, 1, 12, 12), days: 1 });

			expect(result).toEqual(new Date(2024, 1, 14, 12));
		});

		it("should count Carnaval 2024-02-13 as a business day when includeOptional is false", () => {
			const result = addBusinessDays({
				date: new Date(2024, 1, 12, 12),
				days: 1,
				includeOptional: false,
			});

			expect(result).toEqual(new Date(2024, 1, 13, 12));
		});
	});

	describe("negative days", () => {
		it("should walk backwards, skipping weekends (Fri 2024-01-05 - 1 -> Thu 2024-01-04)", () => {
			const result = addBusinessDays({ date: new Date(2024, 0, 5, 12), days: -1 });

			expect(result).toEqual(new Date(2024, 0, 4, 12));
		});

		it("should walk backwards across a weekend (Mon 2024-01-08 - 1 -> Fri 2024-01-05)", () => {
			const result = addBusinessDays({ date: new Date(2024, 0, 8, 12), days: -1 });

			expect(result).toEqual(new Date(2024, 0, 5, 12));
		});
	});

	describe("days: 0", () => {
		it("should return a new Date equal to a business day input, unchanged", () => {
			const input = new Date(2024, 0, 2, 12);
			const result = addBusinessDays({ date: input, days: 0 });

			expect(result).toEqual(new Date(2024, 0, 2, 12));
			expect(result).not.toBe(input);
		});

		it("should return the same calendar day even when it is a Saturday, mirroring date-fns' addBusinessDays(date, 0) behavior of not rolling to the next business day", () => {
			const result = addBusinessDays({ date: new Date(2024, 0, 6, 12), days: 0 });

			expect(result).toEqual(new Date(2024, 0, 6, 12));
		});

		it("should return the same calendar day even when it is a holiday", () => {
			const result = addBusinessDays({ date: new Date(2024, 0, 1, 12), days: 0 });

			expect(result).toEqual(new Date(2024, 0, 1, 12));
		});
	});

	describe("invalid input", () => {
		it("should return null when params is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays(null)).toBeNull();
		});

		it("should return null when params is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays()).toBeNull();
		});

		it("should return null when params is not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays("2024-01-02")).toBeNull();
		});

		it('should return null when params is a function, even one carrying date/days properties (typeof params !== "object" must reject it, not just isNullish)', () => {
			const fakeParams = Object.assign(() => null, { date: new Date(2024, 0, 2), days: 1 });

			expect(addBusinessDays(fakeParams)).toBeNull();
		});

		it("should return null when date is an invalid Date", () => {
			expect(addBusinessDays({ date: new Date("not a date"), days: 1 })).toBeNull();
		});

		it("should return null when date is not a Date", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays({ date: "2024-01-02", days: 1 })).toBeNull();
		});

		it("should return null when days is not an integer", () => {
			expect(addBusinessDays({ date: new Date(2024, 0, 2), days: 1.5 })).toBeNull();
		});

		it("should return null when days is NaN", () => {
			expect(addBusinessDays({ date: new Date(2024, 0, 2), days: Number.NaN })).toBeNull();
		});

		it("should return null when days is Infinity", () => {
			expect(
				addBusinessDays({ date: new Date(2024, 0, 2), days: Number.POSITIVE_INFINITY }),
			).toBeNull();
		});

		it("should return null when days is not a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(addBusinessDays({ date: new Date(2024, 0, 2), days: "1" })).toBeNull();
		});

		it("should return null when stateCode is not a string", () => {
			expect(
				// @ts-expect-error: intentionally invalid input
				addBusinessDays({ date: new Date(2024, 0, 2), days: 1, stateCode: 123 }),
			).toBeNull();
		});
	});

	it("should not mutate the input Date", () => {
		const input = new Date(2024, 0, 2, 12);
		const before = input.getTime();

		addBusinessDays({ date: input, days: 5 });

		expect(input.getTime()).toBe(before);
	});

	it("should preserve the time-of-day of the input", () => {
		const result = addBusinessDays({ date: new Date(2024, 0, 2, 9, 30, 15, 500), days: 1 });

		expect(result?.getHours()).toBe(9);
		expect(result?.getMinutes()).toBe(30);
		expect(result?.getSeconds()).toBe(15);
		expect(result?.getMilliseconds()).toBe(500);
	});

	describe("properties", () => {
		const daysArbitrary = fc.integer({ min: -200, max: 200 });

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(addBusinessDays, fc.anything());
		});

		test("should land on a business day whenever a non-zero number of days is requested", () => {
			fc.assert(
				fc.property(businessDayDates, daysArbitrary, (date, days) => {
					if (days === 0) return;

					const result = addBusinessDays({ date, days });

					if (result !== null) {
						expect(isBusinessDay(result)).toBe(true);
					}
				}),
			);
		});

		test("should move the date forward for positive days and backward for negative days", () => {
			fc.assert(
				fc.property(businessDayDates, daysArbitrary, (date, days) => {
					const result = addBusinessDays({ date, days });

					if (result === null) return;

					if (days > 0) {
						expect(result.getTime()).toBeGreaterThan(date.getTime());
					} else if (days < 0) {
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
	test("should take an AddBusinessDaysParams and return a Date or null", () => {
		expectTypeOf(addBusinessDays).parameter(0).toEqualTypeOf<AddBusinessDaysParams>();
		expectTypeOf<AddBusinessDaysParams>().toEqualTypeOf<{
			date: Date;
			days: number;
			stateCode?: StateCode;
			includeOptional?: boolean;
		}>();
		expectTypeOf(addBusinessDays).returns.toEqualTypeOf<Date | null>();
	});
});
