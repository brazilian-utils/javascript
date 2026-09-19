import { addBusinessDays } from "../add-business-days/add-business-days";
import { type BusinessDayOptions } from "../is-business-day/is-business-day";

export type { BusinessDayOptions } from "../is-business-day/is-business-day";

/**
 * Gets the first Brazilian business day (dia útil) strictly after a date.
 *
 * It is `addBusinessDays(date, 1, options)`, which it delegates to, down to the last detail. A
 * business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a Sunday, or a
 * Brazilian holiday), evaluated with the same `options`.
 *
 * "Next" is **strictly after**, the meaning date-fns gives it in `nextDay`, `nextMonday` and
 * their siblings, verified against its source: `nextDay(date, day)` on a date that already is
 * that day of the week returns the one a week later, never `date` itself. So a `date` that is a
 * business day is never returned; when "on or after" is what you need, check `isBusinessDay`
 * first and keep `date` when it answers `true`.
 *
 * The time-of-day (hours, minutes, seconds, milliseconds) of `date` is preserved in the result,
 * as date-fns' `nextDay` and `addBusinessDays` do, and `date` itself is never mutated.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An `options`
 * that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes. A `date`
 * outside it, or a walk that leaves it, returns `null`.
 *
 * @param {Date} date - The date to look after. Never mutated: a new `Date` is returned.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {Date | null} A new `Date`, the first business day after `date`. `null` on bad input:
 * a `date` that is not a valid `Date` or is outside 1900-2099, a `stateCode` that is not a
 * string, or a walk that leaves the supported years.
 *
 * @example
 * ```typescript
 * getNextBusinessDay(new Date(2024, 0, 2, 12)); // Wed 2024-01-03, 12:00 (strictly after, even though Jan 2 is a business day)
 * getNextBusinessDay(new Date(2024, 0, 5, 12)); // Mon 2024-01-08, 12:00 (skips the weekend)
 * getNextBusinessDay(new Date(2024, 0, 6, 12)); // Mon 2024-01-08, 12:00 (from a Saturday)
 * getNextBusinessDay(new Date(2024, 11, 31, 12)); // Thu 2025-01-02, 12:00 (Jan 1 is Ano novo, skipped)
 * getNextBusinessDay(new Date(2024, 6, 8, 12), { stateCode: "SP" }); // Wed 2024-07-10, 12:00 (Jul 9 is a state holiday in SP)
 * getNextBusinessDay(new Date("not a date")); // null
 * getNextBusinessDay(new Date(2099, 11, 31)); // null (the walk leaves the supported years)
 * ```
 *
 * @see Based on: https://unpkg.com/date-fns@4.1.0/nextDay.js
 * Source used to verify that "next" excludes the date itself and that the time-of-day is kept.
 * The underlying holiday determination's official sources are cited in
 * `isBusinessDay`/`getHolidays`.
 */
export const getNextBusinessDay = (date: Date, options?: BusinessDayOptions): Date | null =>
	addBusinessDays(date, 1, options);
