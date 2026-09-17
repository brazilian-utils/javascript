import { describe, expect, test } from "../test/runtime";
import { isNullish } from "./is-nullish";

describe("isNullish", () => {
	test("should return true for null and undefined", () => {
		const isNullishWithoutArgument = isNullish as unknown as () => boolean;

		expect(isNullish(null)).toBe(true);
		expect(isNullishWithoutArgument()).toBe(true);
	});

	test("should return false for every other value, including falsy ones", () => {
		expect(isNullish("")).toBe(false);
		expect(isNullish(0)).toBe(false);
		expect(isNullish(Number.NaN)).toBe(false);
		expect(isNullish(false)).toBe(false);
		expect(isNullish({})).toBe(false);
	});
});
