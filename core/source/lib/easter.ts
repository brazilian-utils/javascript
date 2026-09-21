import { civilDate } from "./civil";

/**
 * Easter Sunday, with the Meeus/Jones/Butcher (anonymous Gregorian) algorithm.
 *
 * Library code, not an intrinsic: it is a handful of integer operations, so every target gets the
 * same arithmetic instead of a per-language calendar call. Every intermediate is non-negative in
 * the supported year range, so truncated division is the floor division the algorithm assumes.
 */

/** The day of March (1 to 31) or April (32 to 56) Easter falls on, as a day-of-March offset. */
export function easterDayOfMarch(year: IntRange<1583, 9999>): IntRange<22, 56> {
	const a = year % 19;
	const b = year / 100;
	const c = year % 100;
	const d = b / 4;
	const e = b % 4;
	const f = (b + 8) / 25;
	const g = (b - f + 1) / 3;
	const h = (19 * a + b - d - g + 15) % 30;
	const i = c / 4;
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = (a + 11 * h + 22 * l) / 451;
	const day = h + l - 7 * m + 114;

	// `day` counts from 1 March: 22 is 22 March, 56 is 25 April, the two ends of the Easter window.
	return Math.min(Math.max(day % 31 + 1 + (day / 31 - 3) * 31, 22), 56);
}

/** Easter Sunday of a year, as a civil date. */
export function easterSunday(year: IntRange<1900, 2099>): CivilDate {
	const dayOfMarch = easterDayOfMarch(year);

	return dayOfMarch <= 31 ? civilDate(year, 3, dayOfMarch) : civilDate(year, 4, dayOfMarch - 31);
}
