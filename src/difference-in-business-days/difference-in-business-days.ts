import { isSupportedHolidayYear } from "../_internals/is-supported-holiday-year/is-supported-holiday-year";
import { isValidDate } from "../_internals/is-valid-date/is-valid-date";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";

export type { BusinessDayOptions } from "../is-business-day/is-business-day";

const toLocalDayTimestamp = (date: Date): number =>
	Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Counts the number of Brazilian business days (dias úteis) between two dates.
 *
 * Mirrors the semantics of date-fns' `differenceInBusinessDays`, verified against its source
 * (`differenceInBusinessDays.js` in the `date-fns` package), argument order included: the walk
 * starts at `earlierDate` and stops just before `laterDate`, so **`earlierDate` is counted when
 * it is itself a business day and `laterDate` is never counted**, whatever their order, and every
 * business day strictly in between is counted once. Only the calendar day of each `Date` matters,
 * exactly like `differenceInCalendarDays`: the time of day is ignored.
 *
 * The result is positive when `laterDate` is after `earlierDate` and negative when it is before
 * it, the date-fns sign convention; two dates on the same calendar day return `0` (a positive
 * zero, never `-0`).
 *
 * A business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a Sunday,
 * or a Brazilian holiday), evaluated with the same `options`.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An `options`
 * that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a
 * `laterDate` or `earlierDate` outside it returns `null`.
 *
 * @param {Date} laterDate - The date to count to. Never counted itself, regardless of whether it is a business day.
 * @param {Date} earlierDate - The date to count from. Counted as a business day when it is one; never mutated.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {number | null} The number of business days between the two dates, or `null` on bad
 * input: a `laterDate`/`earlierDate` that is not a valid `Date` or is outside 1900-2099, or a
 * `stateCode` that is not a string.
 *
 * @example
 * ```typescript
 * differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1)); // 0 (Jan 1 is Ano novo, not counted)
 * differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2)); // 1 (Jan 2 counted, a Tuesday; Jan 3 is not)
 * differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3)); // -1 (the later date comes first, so the count is negative)
 * differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 2)); // 0 (same day)
 * differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), { stateCode: "SP" }); // 1 (Jul 9 is a state holiday in SP)
 * differenceInBusinessDays(new Date(), new Date("not a date")); // null
 * differenceInBusinessDays(new Date(2100, 0, 5), new Date(2100, 0, 4)); // null (outside the supported years)
 * ```
 *
 * @see Based on: https://date-fns.org/docs/differenceInBusinessDays
 * Documented behavior and the
 * positional `(laterDate, earlierDate)` argument order.
 * @see Based on: https://unpkg.com/date-fns@4.1.0/differenceInBusinessDays.js
 * Source used to
 * verify the exact boundary treatment (`earlierDate` counted, `laterDate` excluded) and the sign
 * convention. The underlying holiday determination's official sources are cited in
 * `isBusinessDay`/`getHolidays`.
 */
export const differenceInBusinessDays = (
	laterDate: Date,
	earlierDate: Date,
	options?: BusinessDayOptions,
): number | null => {
	if (!isValidDate(laterDate)) return null;
	if (!isValidDate(earlierDate)) return null;

	const stateCode = options?.stateCode;

	if (stateCode !== undefined && typeof stateCode !== "string") return null;

	if (!isSupportedHolidayYear(laterDate.getFullYear())) return null;
	if (!isSupportedHolidayYear(earlierDate.getFullYear())) return null;

	const laterDay = toLocalDayTimestamp(laterDate);
	const earlierDay = toLocalDayTimestamp(earlierDate);

	// Stryker disable next-line EqualityOperator: when the two days are equal, the loop below never runs (movingDate already equals laterDay), so < vs <= here is unobservable
	const step = earlierDay < laterDay ? 1 : -1;
	const movingDate = new Date(
		earlierDate.getFullYear(),
		earlierDate.getMonth(),
		earlierDate.getDate(),
	);

	let result = 0;

	while (toLocalDayTimestamp(movingDate) !== laterDay) {
		if (isBusinessDay(movingDate, options)) result += step;
		movingDate.setDate(movingDate.getDate() + step);
	}

	return result;
};
