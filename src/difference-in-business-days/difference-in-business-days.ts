import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import type { StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { isBusinessDay } from "../is-business-day/is-business-day";

export type DifferenceInBusinessDaysParams = {
	/** The date to count from. Counted as a business day when it is one; never mutated. */
	from: Date;
	/** The date to count to. Never counted itself, regardless of whether it is a business day. */
	to: Date;
	/** Two letter state code whose state holidays are also treated as non-business days (default: national holidays only). */
	stateCode?: StateCode;
	/** Whether optional-type holidays (e.g. Carnaval, Corpus Christi) count as non-business days (default: `true`, matching Brazilian banking practice). */
	includeOptional?: boolean;
};

const isSupportedYear = (date: Date): boolean => {
	const year = date.getFullYear();

	return year >= HOLIDAYS_MIN_YEAR && year <= HOLIDAYS_MAX_YEAR;
};

const toLocalDayTimestamp = (date: Date): number =>
	Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Counts the number of Brazilian business days (dias úteis) between two dates.
 *
 * Mirrors the semantics of date-fns' `differenceInBusinessDays`, verified against its source
 * (`differenceInBusinessDays.js` in the `date-fns` package): the day at `from` is counted when
 * it is itself a business day, the day at `to` is never counted, and every business day
 * strictly in between is counted once. Concretely, the function walks one calendar day at a
 * time from `from` towards `to` (or the other way around, when `to` is before `from`), adding
 * one for every day that `isBusinessDay` accepts, stopping just before reaching `to`. Only the
 * calendar day of each `Date` matters, exactly like `differenceInCalendarDays`: the time of day
 * is ignored.
 *
 * A business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a Sunday,
 * or a Brazilian holiday), evaluated with the same `stateCode`/`includeOptional` options.
 *
 * `from` and `to` on the same calendar day return `0`. A `to` before `from` returns a negative
 * number, mirroring date-fns.
 *
 * If `stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`).
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a `from`
 * or `to` outside it returns `null`.
 *
 * @param {DifferenceInBusinessDaysParams} params - The parameters of the calculation.
 * @param {Date} params.from - The date to count from.
 * @param {Date} params.to - The date to count to.
 * @param {StateCode} [params.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [params.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {number|null} The number of business days between `from` and `to`, or `null` on bad
 * input: a `params` that is not an object, a `from`/`to` that is not a valid `Date` or is
 * outside 1900-2099, or a `stateCode` that is not a string.
 *
 * @example
 * ```typescript
 * differenceInBusinessDays({ from: new Date(2024, 0, 1), to: new Date(2024, 0, 2) }); // 0 (Jan 1 is Ano novo)
 * differenceInBusinessDays({ from: new Date(2024, 0, 2), to: new Date(2024, 0, 3) }); // 1 (Jan 2 counted, a Tuesday)
 * differenceInBusinessDays({ from: new Date(2024, 0, 3), to: new Date(2024, 0, 2) }); // -1 (to before from)
 * differenceInBusinessDays({ from: new Date(2024, 0, 2), to: new Date(2024, 0, 2) }); // 0 (same day)
 * differenceInBusinessDays({ from: new Date(2024, 6, 8), to: new Date(2024, 6, 10), stateCode: "SP" }); // 1 (Jul 9 is a state holiday in SP)
 * differenceInBusinessDays({ from: new Date("not a date"), to: new Date() }); // null
 * differenceInBusinessDays({ from: new Date(2100, 0, 4), to: new Date(2100, 0, 5) }); // null (outside the supported years)
 * ```
 *
 * @see Based on: https://date-fns.org/docs/differenceInBusinessDays Documented behavior.
 * @see Based on: https://unpkg.com/date-fns@4.1.0/differenceInBusinessDays.js Source used to
 * verify the exact boundary treatment (`from` counted, `to` excluded) and the sign convention.
 * The underlying holiday determination's official sources are cited in
 * `isBusinessDay`/`getHolidays`.
 */
export const differenceInBusinessDays = (params: DifferenceInBusinessDaysParams): number | null => {
	if (isNullish(params) || typeof params !== "object") return null;

	const { from, to, stateCode, includeOptional } = params;

	if (!(from instanceof Date) || Number.isNaN(from.getTime())) return null;
	if (!(to instanceof Date) || Number.isNaN(to.getTime())) return null;
	if (stateCode !== undefined && typeof stateCode !== "string") return null;

	if (!isSupportedYear(from) || !isSupportedYear(to)) return null;

	const fromDay = toLocalDayTimestamp(from);
	const toDay = toLocalDayTimestamp(to);

	if (fromDay === toDay) return 0;

	const step = fromDay < toDay ? 1 : -1;
	const movingDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());

	let result = 0;

	while (toLocalDayTimestamp(movingDate) !== toDay) {
		if (isBusinessDay(movingDate, { stateCode, includeOptional })) result += step;
		movingDate.setDate(movingDate.getDate() + step);
	}

	return result === 0 ? 0 : result;
};
