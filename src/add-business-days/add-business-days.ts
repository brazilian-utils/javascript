import { isSupportedHolidayYear } from "../_internals/is-supported-holiday-year/is-supported-holiday-year";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";

/**
 * Adds a number of Brazilian business days (dias úteis) to a date.
 *
 * A business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a
 * Sunday, or a Brazilian holiday), evaluated with the same `options`. The function walks one
 * calendar day at a time, in the direction of `amount`, counting only business days, so it is
 * exact regardless of the arrangement of holidays around `date` (cheap in practice:
 * `getHolidays` is memoized per year).
 *
 * `amount: 0` returns a **new `Date` equal to `date`, unchanged**, even when `date` itself
 * falls on a weekend or holiday. This mirrors the verified behavior of date-fns'
 * `addBusinessDays(date, 0)`, which also returns the input date as-is rather than rolling
 * it to the next business day; see `@see` below. A negative `amount` walks backwards, one
 * business day at a time, exactly like date-fns; `subBusinessDays` is the same walk spelled
 * positively.
 *
 * The time-of-day (hours, minutes, seconds, milliseconds) of `date` is preserved in the
 * result, and `date` itself is never mutated.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and
 * only national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An
 * `options` that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes. A `date`
 * outside it, or a walk that leaves it, returns `null`.
 *
 * @param {Date} date - The date to count from. Never mutated: a new `Date` is returned.
 * @param {number} amount - The number of business days to add; a negative value walks backwards.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {Date | null} A new `Date`, `amount` business days after `date`. `null` on bad
 * input: a `date` that is not a valid `Date` or is outside 1900-2099, an `amount` that is not a
 * finite integer, a `stateCode` that is not a string, or a walk that leaves the supported years.
 *
 * @example
 * ```typescript
 * addBusinessDays(new Date(2024, 0, 2, 12), 1); // Wed 2024-01-03, 12:00 (the next day is already a business day)
 * addBusinessDays(new Date(2024, 11, 31, 12), 1); // Thu 2025-01-02, 12:00 (Jan 1 is Ano novo, skipped)
 * addBusinessDays(new Date(2024, 0, 5, 12), -1); // Thu 2024-01-04, 12:00 (walks backwards)
 * addBusinessDays(new Date(2024, 0, 6, 12), 0); // Sat 2024-01-06, 12:00 (unchanged, even though Saturday is not a business day)
 * addBusinessDays(new Date(2024, 6, 8, 12), 1, { stateCode: "SP" }); // Wed 2024-07-10, 12:00 (Jul 9 is a state holiday in SP)
 * addBusinessDays(new Date("not a date"), 1); // null
 * addBusinessDays(new Date(2024, 0, 2), 1.5); // null (not an integer)
 * addBusinessDays(new Date(2099, 11, 31), 1); // null (the walk leaves the supported years)
 * addBusinessDays(null, 1); // null
 * ```
 *
 * @see Based on: https://date-fns.org/docs/addBusinessDays Reference behavior for `amount: 0`,
 * for the positional `(date, amount)` argument order and for walking backwards on a negative
 * `amount`. The underlying holiday determination's official sources are cited in
 * `isBusinessDay`/`getHolidays`.
 */
export const addBusinessDays = (
	date: Date,
	amount: number,
	options?: BusinessDayOptions,
): Date | null => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

	if (!Number.isInteger(amount)) return null;

	const stateCode = options?.stateCode;

	if (stateCode !== undefined && typeof stateCode !== "string") return null;

	if (!isSupportedHolidayYear(date.getFullYear())) return null;

	const result = new Date(date);

	const hours = result.getHours();
	// Stryker disable next-line EqualityOperator: when amount is 0, remaining is 0 below and the loop never reads step, so > vs >= here is unobservable
	const step = amount > 0 ? 1 : -1;
	let remaining = Math.abs(amount);

	while (remaining > 0) {
		result.setDate(result.getDate() + step);

		if (!isSupportedHolidayYear(result.getFullYear())) return null;

		if (isBusinessDay(result, options)) {
			remaining -= 1;
		}
	}

	result.setHours(hours);

	return result;
};
