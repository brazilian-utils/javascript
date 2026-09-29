import { describe, expect, test } from "../test/runtime";
import { readMemoizedHolidays } from "./read-memoized-holidays";

describe("readMemoizedHolidays", () => {
	test("should list the national holidays of a year as year, month and day", () => {
		const holidays = readMemoizedHolidays(2024);

		expect(holidays[0]).toEqual({
			name: "Ano novo",
			type: "national",
			year: 2024,
			month: 0,
			day: 1,
		});
		expect(holidays).toContainEqual({
			name: "Sexta-feira Santa",
			type: "national",
			year: 2024,
			month: 2,
			day: 29,
		});
		expect(holidays).toContainEqual({
			name: "Carnaval (segunda-feira)",
			type: "optional",
			year: 2024,
			month: 1,
			day: 12,
		});
	});

	test("should add the holidays of a state in date order", () => {
		const holidays = readMemoizedHolidays(2024, "SP");
		const paulista = {
			name: "Revolução Constitucionalista",
			type: "state",
			year: 2024,
			month: 6,
			day: 9,
		};

		expect(holidays).toContainEqual(paulista);
		expect(readMemoizedHolidays(2024)).not.toContainEqual(paulista);

		const days = holidays.map(({ month, day }) => month * 100 + day);

		expect(days).toEqual(days.toSorted((a, b) => a - b));
	});

	test("should hand back the same array for the same year and state", () => {
		expect(readMemoizedHolidays(2025, "RJ")).toBe(readMemoizedHolidays(2025, "RJ"));
		expect(readMemoizedHolidays(2025, "RJ")).not.toBe(readMemoizedHolidays(2025, "SP"));
		expect(readMemoizedHolidays(2025)).not.toBe(readMemoizedHolidays(2026));
	});
});
