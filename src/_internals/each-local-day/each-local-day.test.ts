import { describe, expect, inTimeZone, test } from "../test/runtime";
import { eachLocalDay } from "./each-local-day";

const daysOfMonth = (from: number, until: number): number[] =>
	[...eachLocalDay({ from, until })].map((day) => day.getDate());

describe("eachLocalDay", () => {
	test("should yield every day of March 2024 forwards, the day it stops at excluded", () => {
		expect(daysOfMonth(Date.UTC(2024, 2, 1), Date.UTC(2024, 3, 1))).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
			27, 28, 29, 30, 31,
		]);
	});

	test("should yield every day of March 2024 backwards when until comes before from", () => {
		expect(daysOfMonth(Date.UTC(2024, 2, 31), Date.UTC(2024, 1, 29))).toEqual([
			31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
			7, 6, 5, 4, 3, 2, 1,
		]);
	});

	test("should yield nothing when from and until are the same day", () => {
		expect(daysOfMonth(Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 1))).toEqual([]);
	});

	test("should yield a single day when until is its neighbour", () => {
		expect(daysOfMonth(Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 2))).toEqual([1]);
		expect(daysOfMonth(Date.UTC(2024, 2, 1), Date.UTC(2024, 1, 29))).toEqual([1]);
	});

	test("should cross the end of a year, a leap day and a month boundary", () => {
		expect(daysOfMonth(Date.UTC(2023, 11, 30), Date.UTC(2024, 0, 3))).toEqual([30, 31, 1, 2]);
		expect(daysOfMonth(Date.UTC(2024, 1, 28), Date.UTC(2024, 2, 2))).toEqual([28, 29, 1]);
	});

	test("should yield every day at noon local time", () => {
		const [first] = [...eachLocalDay({ from: Date.UTC(2024, 2, 1), until: Date.UTC(2024, 2, 2) })];

		expect(first?.getHours()).toBe(12);
		expect(first?.getMinutes()).toBe(0);
		expect(first?.getSeconds()).toBe(0);
		expect(first?.getMilliseconds()).toBe(0);
	});

	inTimeZone("Pacific/Apia", () => {
		test("should skip 30 December 2011, the day Samoa dropped to cross the date line", () => {
			expect(daysOfMonth(Date.UTC(2011, 11, 1), Date.UTC(2012, 0, 1))).toEqual([
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
				26, 27, 28, 29, 31,
			]);
		});
	});

	inTimeZone("Pacific/Kiritimati", () => {
		test("should skip 31 December 1994, walking backwards too", () => {
			expect(daysOfMonth(Date.UTC(1994, 11, 28), Date.UTC(1995, 0, 1))).toEqual([28, 29, 30]);
			expect(daysOfMonth(Date.UTC(1994, 11, 31), Date.UTC(1994, 11, 27))).toEqual([30, 29, 28]);
		});
	});

	inTimeZone("America/Sao_Paulo", () => {
		test("should yield 4 November 2018, whose local midnight does not exist", () => {
			expect(daysOfMonth(Date.UTC(2018, 10, 3), Date.UTC(2018, 10, 6))).toEqual([3, 4, 5]);
		});

		test("should yield the days either side of the backward transition of 18 February 2018", () => {
			expect(daysOfMonth(Date.UTC(2018, 1, 16), Date.UTC(2018, 1, 19))).toEqual([16, 17, 18]);
		});
	});
});
