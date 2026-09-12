import { describe, expect, test } from "../_internals/test/runtime";
import { isValidVin } from "./is-valid-vin";

describe("isValidVin", () => {
	describe("should return true", () => {
		test("for a known valid VIN with a numeric check digit", () => {
			expect(isValidVin("1HGCM82633A004352")).toBe(true);
		});

		test("for a known valid VIN with an X check digit", () => {
			expect(isValidVin("1M8GDM9AXKP042788")).toBe(true);
		});

		test("for a second known valid VIN", () => {
			expect(isValidVin("JH4TB2H26CC000000")).toBe(true);
		});

		test("for a lowercase value", () => {
			expect(isValidVin("1m8gdm9axkp042788")).toBe(true);
		});

		test("for a value with leading/trailing whitespace", () => {
			expect(isValidVin(" 1HGCM82633A004352 ")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the check digit does not match", () => {
			expect(isValidVin("1HGCM82633A004353")).toBe(false);
		});

		test("when it contains the excluded letter I", () => {
			expect(isValidVin("1HGCM8263IA004352")).toBe(false);
		});

		test("when it contains the excluded letter O", () => {
			expect(isValidVin("1HGCM8263OA004352")).toBe(false);
		});

		test("when it contains the excluded letter Q", () => {
			expect(isValidVin("1HGCM8263QA004352")).toBe(false);
		});

		test("when it has fewer than 17 characters", () => {
			expect(isValidVin("1HGCM82633A00435")).toBe(false);
		});

		test("when it has more than 17 characters", () => {
			expect(isValidVin("1HGCM82633A0043522")).toBe(false);
		});

		test("when the check digit character is a letter other than X", () => {
			expect(isValidVin("1HGCM826C3A004352")).toBe(false);
		});

		test("when it contains a symbol", () => {
			expect(isValidVin("1HGCM82633A00435-")).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidVin("")).toBe(false);
		});

		test("when it is only whitespace", () => {
			expect(isValidVin("                 ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidVin(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidVin(undefined)).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(isValidVin(12345678901234)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidVin(true)).toBe(false);
			// @ts-expect-error
			expect(isValidVin(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error
			expect(isValidVin({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error
			expect(isValidVin([])).toBe(false);
		});
	});
});
