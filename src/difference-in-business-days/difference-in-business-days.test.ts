import { describe, expect, it } from "../_internals/test/runtime";
import { differenceInBusinessDays } from "./difference-in-business-days";

describe("differenceInBusinessDays", () => {
	it("should return 0 for the same calendar day", () => {
		const result = differenceInBusinessDays({
			from: new Date(2024, 0, 2, 9),
			to: new Date(2024, 0, 2, 18),
		});

		expect(result).toBe(0);
	});

	it("should count the from day when it is a business day and exclude the to day (Tue 2024-01-02 to Wed 2024-01-03)", () => {
		const result = differenceInBusinessDays({
			from: new Date(2024, 0, 2),
			to: new Date(2024, 0, 3),
		});

		expect(result).toBe(1);
	});

	it("should not count the from day when it is a holiday (2024-01-01 Ano novo to 2024-01-02)", () => {
		const result = differenceInBusinessDays({
			from: new Date(2024, 0, 1),
			to: new Date(2024, 0, 2),
		});

		expect(result).toBe(0);
	});

	it("should skip weekends between from and to (Fri 2024-01-05 to Mon 2024-01-08)", () => {
		const result = differenceInBusinessDays({
			from: new Date(2024, 0, 5),
			to: new Date(2024, 0, 8),
		});

		expect(result).toBe(1);
	});

	it("should ignore the time of day of both from and to", () => {
		const result = differenceInBusinessDays({
			from: new Date(2024, 0, 2, 23, 59),
			to: new Date(2024, 0, 3, 0, 1),
		});

		expect(result).toBe(1);
	});

	describe("supported years", () => {
		it("should return null when from or to is outside 1900-2099", () => {
			expect(
				differenceInBusinessDays({ from: new Date(2100, 0, 4), to: new Date(2100, 0, 5) }),
			).toBeNull();
			expect(
				differenceInBusinessDays({ from: new Date(2099, 11, 31), to: new Date(2100, 0, 4) }),
			).toBeNull();
			expect(
				differenceInBusinessDays({ from: new Date(1899, 11, 29), to: new Date(1900, 0, 2) }),
			).toBeNull();
		});

		it("should accept the inclusive boundary years 1900 and 2099 (same-day range, so the result is 0 rather than null)", () => {
			expect(
				differenceInBusinessDays({ from: new Date(1900, 0, 2), to: new Date(1900, 0, 2) }),
			).toBe(0);
			expect(
				differenceInBusinessDays({ from: new Date(2099, 0, 2), to: new Date(2099, 0, 2) }),
			).toBe(0);
		});
	});

	describe("negative results", () => {
		it("should return a negative number when to is before from (Wed 2024-01-03 to Tue 2024-01-02)", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 0, 3),
				to: new Date(2024, 0, 2),
			});

			expect(result).toBe(-1);
		});

		it("should return positive zero, not negative zero, when there are no business days walking backwards (Sun 2024-01-07 to Sat 2024-01-06)", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 0, 7),
				to: new Date(2024, 0, 6),
			});

			expect(result).toBe(0);
			expect(Object.is(result, -0)).toBe(false);
		});
	});

	describe("national holidays and year boundaries", () => {
		it("should count business days across a year boundary, skipping Ano novo (2024-12-30 Mon to 2025-01-03 Fri)", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 11, 30),
				to: new Date(2025, 0, 3),
			});

			expect(result).toBe(3);
		});
	});

	describe("state holidays", () => {
		it("should skip a state holiday when stateCode is provided (SP, Revolução Constitucionalista 2024-07-09)", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 6, 8),
				to: new Date(2024, 6, 10),
				stateCode: "SP",
			});

			expect(result).toBe(1);
		});

		it("should not skip that date when stateCode is not provided", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 6, 8),
				to: new Date(2024, 6, 10),
			});

			expect(result).toBe(2);
		});
	});

	describe("includeOptional", () => {
		it("should skip Carnaval 2024-02-13 by default (includeOptional defaults to true)", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 1, 12),
				to: new Date(2024, 1, 14),
			});

			expect(result).toBe(1);
		});

		it("should count Carnaval 2024-02-13 as a business day when includeOptional is false", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 1, 12),
				to: new Date(2024, 1, 14),
				includeOptional: false,
			});

			expect(result).toBe(2);
		});
	});

	describe("invalid input", () => {
		it("should return null when params is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays(null)).toBeNull();
		});

		it("should return null when params is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays()).toBeNull();
		});

		it("should return null when params is not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(differenceInBusinessDays("2024-01-02")).toBeNull();
		});

		it('should return null when params is a function, even one carrying from/to properties (typeof params !== "object" must reject it, not just isNullish)', () => {
			const fakeParams = Object.assign(() => null, {
				from: new Date(2024, 0, 2),
				to: new Date(2024, 0, 3),
			});

			expect(differenceInBusinessDays(fakeParams)).toBeNull();
		});

		it("should return null when from is an invalid Date", () => {
			expect(
				differenceInBusinessDays({ from: new Date("not a date"), to: new Date(2024, 0, 2) }),
			).toBeNull();
		});

		it("should return null when to is an invalid Date", () => {
			expect(
				differenceInBusinessDays({ from: new Date(2024, 0, 2), to: new Date("not a date") }),
			).toBeNull();
		});

		it("should return null when from is not a Date", () => {
			expect(
				// @ts-expect-error: intentionally invalid input
				differenceInBusinessDays({ from: "2024-01-02", to: new Date(2024, 0, 3) }),
			).toBeNull();
		});

		it("should return null when to is not a Date", () => {
			expect(
				// @ts-expect-error: intentionally invalid input
				differenceInBusinessDays({ from: new Date(2024, 0, 2), to: "2024-01-03" }),
			).toBeNull();
		});

		it("should return null when stateCode is not a string", () => {
			expect(
				differenceInBusinessDays({
					from: new Date(2024, 0, 2),
					to: new Date(2024, 0, 3),
					// @ts-expect-error: intentionally invalid input
					stateCode: 11,
				}),
			).toBeNull();
		});

		it("should ignore a stateCode that is not a known state", () => {
			const result = differenceInBusinessDays({
				from: new Date(2024, 0, 2),
				to: new Date(2024, 0, 3),
				// @ts-expect-error: intentionally invalid input
				stateCode: "XX",
			});

			expect(result).toBe(1);
		});
	});
});
