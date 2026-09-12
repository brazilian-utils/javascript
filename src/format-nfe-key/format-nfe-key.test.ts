import { describe, expect, test } from "../_internals/test/runtime";
import { formatNfeKey } from "./format-nfe-key";

const KEY = "35170458716523000119550010000000121000123458";
const FORMATTED = "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458";

describe("formatNfeKey", () => {
	test("should format a full access key into groups of 4 digits", () => {
		expect(formatNfeKey(KEY)).toBe(FORMATTED);
	});

	test("should format partial values as far as they go", () => {
		expect(formatNfeKey("")).toBe("");
		expect(formatNfeKey("1")).toBe("1");
		expect(formatNfeKey("123")).toBe("123");
		expect(formatNfeKey("1234")).toBe("1234");
		expect(formatNfeKey("12345")).toBe("1234 5");
	});

	test("should NOT add digits after the access key length (44)", () => {
		expect(formatNfeKey(`${KEY}999999`)).toBe(FORMATTED);
	});

	test("should remove all non numeric characters, including the NFe prefix", () => {
		expect(formatNfeKey(`NFe${KEY}`)).toBe(FORMATTED);
		expect(formatNfeKey(FORMATTED)).toBe(FORMATTED);
	});

	test("should return an empty string for nullish input", () => {
		// @ts-expect-error
		expect(formatNfeKey(null)).toBe("");
		// @ts-expect-error
		expect(formatNfeKey(undefined)).toBe("");
	});

	test("should not throw for other bad input types", () => {
		// @ts-expect-error
		expect(formatNfeKey(123)).toBe("123");
		// @ts-expect-error
		expect(formatNfeKey({})).toBe("");
		// @ts-expect-error
		expect(formatNfeKey([])).toBe("");
		// @ts-expect-error
		expect(formatNfeKey(true)).toBe("");
	});
});
