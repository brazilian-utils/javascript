import { describe, expect, expectTypeOf, test } from "../test/runtime";
import { isValidDate } from "./is-valid-date";

describe("isValidDate", () => {
	test("should accept a date naming a real instant", () => {
		expect(isValidDate(new Date(2024, 0, 1))).toBe(true);
	});

	test("should reject a date whose time is NaN", () => {
		expect(isValidDate(new Date("nonsense"))).toBe(false);
	});

	test("should reject a value that is not a date", () => {
		expect(isValidDate("2024-01-01")).toBe(false);
		expect(isValidDate(1_704_067_200_000)).toBe(false);
		expect(isValidDate(null)).toBe(false);
		expect(isValidDate({ getTime: () => 0 })).toBe(false);
	});

	test("types", () => {
		expectTypeOf(isValidDate).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(isValidDate).returns.toEqualTypeOf<boolean>();
	});
});
