import { addBusinessDays } from "../add-business-days/add-business-days";
import { type BusinessDayOptions } from "../is-business-day/is-business-day";

export type { BusinessDayOptions } from "../is-business-day/is-business-day";

/**
 * Subtracts a number of Brazilian business days (dias úteis) from a date.
 *
 * The mirror image of `addBusinessDays`, which it delegates to: `subBusinessDays(date, amount)`
 * is `addBusinessDays(date, -amount)`, down to the last detail. A business day is a day for
 * which `isBusinessDay` returns `true` (not a Saturday, a Sunday, or a Brazilian holiday;
 * `options.includeSaturday` keeps Saturday), evaluated with the same `options`, and the walk goes
 * one calendar day at a time, counting only business days.
 *
 * `amount: 0` returns a **new `Date` equal to `date`, unchanged**, even when `date` itself falls
 * on a weekend or holiday, and a negative `amount` walks *forwards*, exactly like date-fns'
 * `subBusinessDays`.
 *
 * The time-of-day (hours, minutes, seconds, milliseconds) of `date` is preserved in the result,
 * daylight saving transitions along the way included, and `date` itself is never mutated. The
 * one case that cannot be honoured is a time of day the resulting local day does not have, such
 * as `00:30` on a day whose clocks jump from `00:00` to `01:00`: the result is then the nearest
 * instant of that day, `01:30`, as in `addBusinessDays`.
 *
 * `options.includeSaturday` defaults to `false`, the Monday to Friday banking count. Pass `true`
 * for the labour law count of Instrução Normativa MTP nº 2/2021, art. 14, I, which includes
 * Saturday and still excludes Sunday and holidays, so a holiday that falls on a Saturday is never
 * counted. See `isBusinessDay` for the law behind it and for what it does not cover: municipal
 * holidays, which `getHolidays` does not carry.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An `options`
 * that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes. A `date`
 * outside it, or a walk that leaves it, returns `null`.
 *
 * @param {Date} date - The date to count from. Never mutated: a new `Date` is returned.
 * @param {number} amount - The number of business days to subtract; a negative value walks forwards.
 * @param {BusinessDayOptions} [options] - Which days count as business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @param {boolean} [options.includeSaturday] - Whether Saturday counts as a business day (default: `false`).
 * @returns {Date | null} A new `Date`, `amount` business days before `date`. `null` on bad input:
 * a `date` that is not a valid `Date` or is outside 1900-2099, an `amount` that is not a finite
 * integer, a `stateCode` that is not a string, or a walk that leaves the supported years.
 *
 * @example
 * ```typescript
 * subBusinessDays(new Date(2024, 0, 5, 12), 1); // Thu 2024-01-04, 12:00 (the previous day is already a business day)
 * subBusinessDays(new Date(2024, 0, 8, 12), 1); // Fri 2024-01-05, 12:00 (walks back over the weekend)
 * subBusinessDays(new Date(2025, 0, 2, 12), 1); // Tue 2024-12-31, 12:00 (Jan 1 is Ano novo, skipped)
 * subBusinessDays(new Date(2024, 0, 5, 12), -1); // Mon 2024-01-08, 12:00 (walks forwards)
 * subBusinessDays(new Date(2024, 0, 6, 12), 0); // Sat 2024-01-06, 12:00 (unchanged, even though Saturday is not a business day)
 * subBusinessDays(new Date(2024, 0, 8, 12), 1, { includeSaturday: true }); // Sat 2024-01-06, 12:00 (labour count)
 * subBusinessDays(new Date(2024, 10, 4, 12), 1, { includeSaturday: true }); // Fri 2024-11-01, 12:00 (Nov 2 is Finados, a holiday on a Saturday)
 * subBusinessDays(new Date(2024, 6, 10, 12), 1, { stateCode: "SP" }); // Mon 2024-07-08, 12:00 (Jul 9 is a state holiday in SP)
 * subBusinessDays(new Date("not a date"), 1); // null
 * subBusinessDays(new Date(2024, 0, 2), 1.5); // null (not an integer)
 * subBusinessDays(new Date(1900, 0, 2), 1); // null (the walk leaves the supported years)
 * ```
 *
 * @see Based on: https://date-fns.org/docs/subBusinessDays
 * Reference behavior and the positional
 * `(date, amount)` argument order. The underlying holiday determination's official sources are
 * cited in `isBusinessDay`/`getHolidays`.
 */
export const subBusinessDays = (
	date: Date,
	amount: number,
	options?: BusinessDayOptions,
): Date | null => {
	if (!Number.isInteger(amount)) return null;

	return addBusinessDays(date, -amount, options);
};
