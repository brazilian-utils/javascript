import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../constants/holidays";

/**
 * Checks whether a year is inside the range the holiday tables cover.
 *
 * `getHolidays` only computes 1900 through 2099, so every date utility built on top of it
 * (`isBusinessDay`, `addBusinessDays`, `subBusinessDays`, `differenceInBusinessDays`) refuses a
 * year outside that range instead of silently answering as if there were no holidays in it.
 *
 * @param {number} year - The full year to check, as `Date#getFullYear` reports it.
 * @returns {boolean} True when the bundled holiday tables cover the year.
 *
 * @example
 * ```typescript
 * isSupportedHolidayYear(2024); // true
 * isSupportedHolidayYear(1900); // true (inclusive lower bound)
 * isSupportedHolidayYear(2099); // true (inclusive upper bound)
 * isSupportedHolidayYear(2100); // false
 * ```
 */
export const isSupportedHolidayYear = (year: number): boolean =>
	year >= HOLIDAYS_MIN_YEAR && year <= HOLIDAYS_MAX_YEAR;
