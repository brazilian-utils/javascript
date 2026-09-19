import { getNthBusinessDay } from "../get-nth-business-day/get-nth-business-day";
import { type BusinessDayOptions } from "../is-business-day/is-business-day";

export type { BusinessDayOptions } from "../is-business-day/is-business-day";

/**
 * Gets the last Brazilian business day (dia útil) of the month a date falls in.
 *
 * It is `getNthBusinessDay(date, -1, options)`, which it delegates to, down to the last detail. A
 * business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a Sunday, or a
 * Brazilian holiday), evaluated with the same `options`, and the month is the one of `date`'s
 * **local calendar day**; the day of the month and the time of day of `date` are ignored.
 *
 * The name and the result follow date-fns' `lastDayOfMonth`: a new `Date` at the start of that
 * local day (00:00:00.000), with `date` itself never mutated.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An `options`
 * that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a `date`
 * outside it returns `null`.
 *
 * @param {Date} date - Any date inside the month to look at. Never mutated: a new `Date` is returned.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {Date | null} A new `Date` at 00:00 local time of the last business day of the month.
 * `null` on bad input: a `date` that is not a valid `Date` or is outside 1900-2099, or a
 * `stateCode` that is not a string.
 *
 * @example
 * ```typescript
 * getLastBusinessDayOfMonth(new Date(2024, 0, 15)); // Wed 2024-01-31, 00:00
 * getLastBusinessDayOfMonth(new Date(2024, 2, 1)); // Thu 2024-03-28, 00:00 (Mar 29 is Sexta-feira Santa, then a weekend)
 * getLastBusinessDayOfMonth(new Date(2024, 7, 31, 18, 30)); // Fri 2024-08-30, 00:00 (Aug 31 is a Saturday)
 * getLastBusinessDayOfMonth(new Date(2018, 4, 1)); // Wed 2018-05-30, 00:00 (May 31 is Corpus Christi, optional, counted by default)
 * getLastBusinessDayOfMonth(new Date(2018, 4, 1), { includeOptional: false }); // Thu 2018-05-31, 00:00
 * getLastBusinessDayOfMonth(new Date(2023, 10, 1), { stateCode: "DF" }); // Wed 2023-11-29, 00:00 (Nov 30 is Dia do Evangélico in DF)
 * getLastBusinessDayOfMonth(new Date("not a date")); // null
 * getLastBusinessDayOfMonth(new Date(2100, 0, 15)); // null (outside the supported years)
 * ```
 *
 * @see Based on: https://unpkg.com/date-fns@4.1.0/lastDayOfMonth.js
 * Reference for the name, for returning the start of the local day and for never mutating the
 * input. The underlying holiday determination's official sources are cited in
 * `isBusinessDay`/`getHolidays`.
 */
export const getLastBusinessDayOfMonth = (date: Date, options?: BusinessDayOptions): Date | null =>
	getNthBusinessDay(date, -1, options);
