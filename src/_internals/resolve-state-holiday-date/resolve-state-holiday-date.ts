/** How a holiday's date is defined: a fixed day and month, or an offset in days from Easter Sunday. */
export type HolidayDateRule = {
	/** Day of the month, 1 to 31, used together with `month`. */
	day?: number;
	/** Month, 1 to 12, used together with `day`. */
	month?: number;
	/** Offset in days from Easter Sunday (Carnaval is -47, Corpus Christi is 60); Easter itself is 0. */
	easterOffset?: number;
};

function calculateEaster(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);

	const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
	const day = ((h + l - 7 * m + 114) % 31) + 1;

	return new Date(year, month, day);
}

function calculateHolidayFromEaster(year: number, offset: number): Date {
	const easterDate = calculateEaster(year);
	const holidayDate = new Date(easterDate);
	holidayDate.setDate(easterDate.getDate() + offset);
	return holidayDate;
}

/**
 * Resolves the date of a holiday in a given year: a fixed `day`/`month` pair, or an offset in
 * days from Easter Sunday, computed with the Meeus/Jones/Butcher algorithm.
 *
 * @param {number} year - The four digit year.
 * @param {HolidayDateRule} rule - The fixed date or the Easter offset of the holiday.
 * @returns {Date} The holiday date in the local time zone.
 * @throws {Error} When the rule defines neither `easterOffset` nor both `day` and `month`.
 *
 * @example
 * ```typescript
 * resolveStateHolidayDate(2024, { easterOffset: 0 }); // 2024-03-31 (Easter Sunday)
 * resolveStateHolidayDate(2024, { easterOffset: 60 }); // 2024-05-30 (Corpus Christi)
 * resolveStateHolidayDate(2024, { day: 9, month: 7 }); // 2024-07-09
 * ```
 *
 * @see Based on: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
 */
export const resolveStateHolidayDate = (
	year: number,
	{ day, month, easterOffset }: HolidayDateRule,
): Date => {
	if (easterOffset !== undefined) {
		return calculateHolidayFromEaster(year, easterOffset);
	}

	if (day !== undefined && month !== undefined) {
		return new Date(year, month - 1, day);
	}

	throw new Error(
		"State holiday entry must define either `easterOffset` or both `day` and `month`",
	);
};
