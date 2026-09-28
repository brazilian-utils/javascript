/**
 * How a holiday's date is defined: a fixed day and month, an offset in days from Easter Sunday,
 * or the first Sunday of a month.
 */
export type HolidayDateRule = (
	| {
			/** Offset in days from Easter Sunday (Carnaval Monday is -48 and Tuesday -47, Corpus Christi is 60); Easter itself is 0. */
			easterOffset: number;
	  }
	| {
			/** Day of the month, 1 to 31, used together with `month`. */
			day: number;
			/** Month, 1 to 12, used together with `day`. */
			month: number;
	  }
	| {
			/** Month, 1 to 12, whose first Sunday is the holiday, as Pernambuco's data magna of 2010 to 2017 was. */
			firstSundayOfMonth: number;
	  }
) & {
	/**
	 * Whether the holiday is observed on the following Sunday when the date the rule resolves to
	 * is not a Sunday (Monday to Saturday), as Santa Catarina's two state holidays are.
	 */
	nextSundayUnlessSunday?: boolean;
	/**
	 * Whether the holiday is observed on the Monday before when the date the rule resolves to falls
	 * on a Tuesday, and on the Friday after when it falls on a Thursday, as Alagoas' 30 November
	 * does.
	 */
	tuesdayToMondayThursdayToFriday?: boolean;
};

const SUNDAY = 0;
const TUESDAY = 2;
const THURSDAY = 4;
const DAYS_IN_WEEK = 7;

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

function moveToNextSundayUnlessSunday(date: Date): Date {
	const weekday = date.getDay();

	if (weekday === SUNDAY) return date;

	const observed = new Date(date);
	observed.setDate(date.getDate() + (DAYS_IN_WEEK - weekday));

	return observed;
}

function calculateFirstSundayOfMonth(year: number, month: number): Date {
	// Sunday is weekday 0, so the days from the 1st to the first Sunday are 7 minus its weekday,
	// or none when the 1st is already a Sunday.
	const firstWeekday = new Date(year, month - 1, 1).getDay();

	return new Date(year, month - 1, 1 + ((DAYS_IN_WEEK - firstWeekday) % DAYS_IN_WEEK));
}

function moveTuesdayToMondayThursdayToFriday(date: Date): Date {
	const weekday = date.getDay();

	if (weekday !== TUESDAY && weekday !== THURSDAY) return date;

	const observed = new Date(date);
	observed.setDate(date.getDate() + (weekday === TUESDAY ? -1 : 1));

	return observed;
}

/**
 * Resolves the date of a holiday in a given year: a fixed `day`/`month` pair, an offset in days
 * from Easter Sunday, computed with the Meeus/Jones/Butcher algorithm, or the first Sunday of a
 * month. When the rule sets `nextSundayUnlessSunday`, a date landing Monday to Saturday is moved
 * on to the following Sunday; when
 * it sets `tuesdayToMondayThursdayToFriday`, a Tuesday is moved back to the Monday and a Thursday
 * on to the Friday.
 *
 * @param {number} year - The four digit year.
 * @param {HolidayDateRule} rule - The fixed date, the Easter offset or the month of the holiday.
 * @returns {Date} The holiday date in the local time zone.
 *
 * @example
 * ```typescript
 * resolveStateHolidayDate(2024, { easterOffset: 0 }); // 2024-03-31 (Easter Sunday)
 * resolveStateHolidayDate(2024, { easterOffset: 60 }); // 2024-05-30 (Corpus Christi)
 * resolveStateHolidayDate(2024, { day: 9, month: 7 }); // 2024-07-09
 * resolveStateHolidayDate(2025, { day: 11, month: 8, nextSundayUnlessSunday: true }); // 2025-08-17
 * resolveStateHolidayDate(2018, { day: 11, month: 8, nextSundayUnlessSunday: true }); // 2018-08-12 (from a Saturday)
 * resolveStateHolidayDate(2015, { firstSundayOfMonth: 3 }); // 2015-03-01
 * resolveStateHolidayDate(2027, { day: 30, month: 11, tuesdayToMondayThursdayToFriday: true }); // 2027-11-29
 * ```
 *
 * @see Based on: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
 */
export const resolveStateHolidayDate = (year: number, rule: HolidayDateRule): Date => {
	let date: Date;

	if ("easterOffset" in rule) {
		date = calculateHolidayFromEaster(year, rule.easterOffset);
	} else if ("firstSundayOfMonth" in rule) {
		date = calculateFirstSundayOfMonth(year, rule.firstSundayOfMonth);
	} else {
		date = new Date(year, rule.month - 1, rule.day);
	}

	if (rule.nextSundayUnlessSunday === true) return moveToNextSundayUnlessSunday(date);

	return rule.tuesdayToMondayThursdayToFriday === true
		? moveTuesdayToMondayThursdayToFriday(date)
		: date;
};
