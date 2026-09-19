import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { toJsonValue } from "./to-json-value";

describe("toJsonValue", () => {
	test("should write a Date as its local calendar date", () => {
		expect(toJsonValue(new Date(2024, 0, 1))).toBe("2024-01-01");
		expect(toJsonValue(new Date(2024, 11, 31, 23, 59, 59, 999))).toBe("2024-12-31");
		expect(toJsonValue(new Date(1999, 9, 5, 12))).toBe("1999-10-05");
	});

	test("should pad a year below 1000 to four digits", () => {
		const date = new Date(2024, 2, 9);
		date.setFullYear(987);

		expect(toJsonValue(date)).toBe("0987-03-09");
	});

	test("should write an invalid Date and undefined as null", () => {
		expect(toJsonValue(new Date("not a date"))).toBeNull();
		expect(toJsonValue()).toBeNull();
	});

	test("should return primitives and null untouched", () => {
		expect(toJsonValue("746.506.880-00")).toBe("746.506.880-00");
		expect(toJsonValue("")).toBe("");
		expect(toJsonValue(0)).toBe(0);
		expect(toJsonValue(1234.56)).toBe(1234.56);
		expect(toJsonValue(true)).toBe(true);
		expect(toJsonValue(false)).toBe(false);
		expect(toJsonValue(null)).toBeNull();
	});

	test("should copy arrays and objects recursively", () => {
		const holiday = { name: "Ano novo", date: new Date(2024, 0, 1), type: "national" };
		const holidays = [holiday];

		expect(toJsonValue(holidays)).toStrictEqual([
			{ name: "Ano novo", date: "2024-01-01", type: "national" },
		]);
		expect(toJsonValue(holidays)).not.toBe(holidays);
		expect(holiday.date instanceof Date).toBe(true);
		expect(toJsonValue({ info: { expirationDate: null, tags: ["a", undefined] } })).toStrictEqual({
			info: { expirationDate: null, tags: ["a", null] },
		});
		expect(toJsonValue([])).toStrictEqual([]);
		expect(toJsonValue({})).toStrictEqual({});
	});

	describe("properties", () => {
		test("should leave every JSON value unchanged", () => {
			fc.assert(
				fc.property(fc.jsonValue(), (value) => {
					expect(JSON.stringify(toJsonValue(value))).toBe(JSON.stringify(value));
				}),
			);
		});

		test("should write every local calendar date as YYYY-MM-DD", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1900, max: 2099 }),
					fc.integer({ min: 0, max: 11 }),
					fc.integer({ min: 1, max: 28 }),
					fc.integer({ min: 0, max: 23 }),
					(year, month, day, hour) => {
						expect(toJsonValue(new Date(year, month, day, hour))).toBe(
							`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
						);
					},
				),
			);
		});
	});
});

describe("toJsonValue types", () => {
	test("should take any value and return an unknown one", () => {
		expectTypeOf(toJsonValue).parameters.toEqualTypeOf<[value?: unknown]>();
		expectTypeOf(toJsonValue).returns.toEqualTypeOf<unknown>();
	});
});
