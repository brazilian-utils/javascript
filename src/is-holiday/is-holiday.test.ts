import { describe, expect, it } from "../_internals/test/runtime";
import { isHoliday } from "./is-holiday";

describe("isHoliday", () => {
	it("should return true for a national holiday built from local date components", () => {
		expect(isHoliday({ targetDate: new Date(2024, 0, 1) })).toBe(true);
	});

	it("should return true for Corpus Christi 2024 (Easter + 60 days)", () => {
		expect(isHoliday({ targetDate: new Date(2024, 4, 30) })).toBe(true);
	});

	it("should return false for a non-holiday date", () => {
		expect(isHoliday({ targetDate: new Date(2024, 5, 10) })).toBe(false);
	});

	it("should return true for a state holiday when stateCode is provided", () => {
		expect(isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: "SP" })).toBe(true);
	});

	it("should return false for a state holiday of another state when stateCode is not provided", () => {
		expect(isHoliday({ targetDate: new Date(2024, 6, 9) })).toBe(false);
	});

	it("should return false when called without arguments", () => {
		expect(isHoliday()).toBe(false);
	});

	it("should return false when targetDate is an invalid Date", () => {
		expect(isHoliday({ targetDate: new Date("not a date") })).toBe(false);
	});

	it("should return false when targetDate is a string instead of a Date", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isHoliday({ targetDate: "2024-01-01" })).toBe(false);
	});

	it('should return false when options is a function, even one carrying a targetDate property (typeof options !== "object" must reject it, not just isNullish)', () => {
		const fakeOptions = Object.assign(() => null, { targetDate: new Date(2024, 0, 1) });

		expect(isHoliday(fakeOptions)).toBe(false);
	});

	it("should return false when stateCode is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isHoliday({ targetDate: new Date(2024, 0, 1), stateCode: 123 })).toBe(false);
	});

	it("should return false for a day-of-month that matches a holiday's day but falls in a different month (Feb 1 shares its day-of-month with Ano novo, Jan 1)", () => {
		expect(isHoliday({ targetDate: new Date(2024, 1, 1) })).toBe(false);
	});

	it("should ignore an unknown stateCode and fall back to national holidays", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isHoliday({ targetDate: new Date(2024, 0, 1), stateCode: "XX" })).toBe(true);
		// @ts-expect-error: intentionally invalid input
		expect(isHoliday({ targetDate: new Date(2024, 5, 10), stateCode: "XX" })).toBe(false);
	});

	describe("local calendar date vs UTC instant", () => {
		it("should read the local calendar day of a UTC-midnight instant, not its UTC day, deriving the expectation from the ambient zone (e.g. '2024-12-25' is local 2024-12-24 in America/Sao_Paulo, UTC-3) so the test is deterministic under vitest, bun and deno", () => {
			const utcMidnight = new Date("2024-12-25");
			const isLocallyChristmas = utcMidnight.getMonth() === 11 && utcMidnight.getDate() === 25;

			expect(isHoliday({ targetDate: utcMidnight })).toBe(isLocallyChristmas);
		});

		it("should return true when the date is built from local components instead", () => {
			expect(isHoliday({ targetDate: new Date(2024, 11, 25) })).toBe(true);
		});
	});
});
