import { describe, expect, it } from "../_internals/test/runtime";
import { isBusinessDay } from "./is-business-day";

describe("isBusinessDay", () => {
	it("should return true for a plain weekday that is not a holiday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 2, 12))).toBe(true);
	});

	it("should return false for a Saturday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 6, 12))).toBe(false);
	});

	it("should return false for a Sunday (noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 7, 12))).toBe(false);
	});

	it("should return false for a national holiday (Ano novo, noon, DST-safe)", () => {
		expect(isBusinessDay(new Date(2024, 0, 1, 12))).toBe(false);
	});

	it("should return false for Corpus Christi 2024 by default (optional holiday counts, banking practice)", () => {
		expect(isBusinessDay(new Date(2024, 4, 30, 12))).toBe(false);
	});

	it("should return false outside the 1900-2099 range getHolidays computes (Mon 2100-01-04 and Fri 1899-12-29)", () => {
		expect(isBusinessDay(new Date(2100, 0, 4, 12))).toBe(false);
		expect(isBusinessDay(new Date(1899, 11, 29, 12))).toBe(false);
		expect(isBusinessDay(new Date(2099, 11, 31, 12))).toBe(true);
	});

	describe("state holidays", () => {
		it("should return false for a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: "SP" })).toBe(false);
		});

		it("should return true for the same date when stateCode is not provided", () => {
			expect(isBusinessDay(new Date(2024, 6, 9, 12))).toBe(true);
		});

		it("should ignore an unknown stateCode and fall back to national holidays", () => {
			// @ts-expect-error
			expect(isBusinessDay(new Date(2024, 6, 9, 12), { stateCode: "XX" })).toBe(true);
		});
	});

	describe("includeOptional", () => {
		it("should return false for Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			expect(isBusinessDay(new Date(2024, 1, 13, 12))).toBe(false);
		});

		it("should return true for Carnaval 2024-02-13 when includeOptional is false", () => {
			expect(isBusinessDay(new Date(2024, 1, 13, 12), { includeOptional: false })).toBe(true);
		});

		it("should still return false for a national (non-optional) holiday when includeOptional is false", () => {
			expect(isBusinessDay(new Date(2024, 0, 1, 12), { includeOptional: false })).toBe(false);
		});
	});

	describe("year boundaries", () => {
		it("should return false for 2024-12-31 only if it were a holiday, but treat it as a business day (Tuesday, no holiday)", () => {
			expect(isBusinessDay(new Date(2024, 11, 31, 12))).toBe(true);
		});

		it("should return false for 2025-01-01 (Ano novo, next year)", () => {
			expect(isBusinessDay(new Date(2025, 0, 1, 12))).toBe(false);
		});

		it("should treat the inclusive boundary year 1900 as supported (1900-01-02 was a Tuesday, not Ano novo)", () => {
			expect(isBusinessDay(new Date(1900, 0, 2, 12))).toBe(true);
		});
	});

	describe("invalid input", () => {
		it("should return false for an invalid Date", () => {
			expect(isBusinessDay(new Date("not a date"))).toBe(false);
		});

		it("should return false for a non-Date value", () => {
			// @ts-expect-error
			expect(isBusinessDay("2024-01-02")).toBe(false);
		});

		it("should return false for null", () => {
			// @ts-expect-error
			expect(isBusinessDay(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			// @ts-expect-error
			expect(isBusinessDay(undefined)).toBe(false);
		});
	});

	it("should not mutate the input Date", () => {
		const value = new Date(2024, 0, 6, 12);
		const original = new Date(value.getTime());

		isBusinessDay(value, { stateCode: "SP" });

		expect(value.getTime()).toBe(original.getTime());
	});
});
