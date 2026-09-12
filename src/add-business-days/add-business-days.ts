import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import type { StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { isBusinessDay } from "../is-business-day/is-business-day";

export type AddBusinessDaysParams = {
	/** The date to count from. Never mutated: a new `Date` is returned. */
	date: Date;
	/** Number of business days to add; a negative value walks backwards. Must be a finite integer. */
	days: number;
	/** Two letter state code whose state holidays are also treated as non-business days (default: national holidays only). */
	stateCode?: StateCode;
	/** Whether optional-type holidays (e.g. Carnaval, Corpus Christi) count as non-business days (default: `true`, matching Brazilian banking practice). */
	includeOptional?: boolean;
};

const isSupportedYear = (date: Date): boolean => {
	const year = date.getFullYear();

	return year >= HOLIDAYS_MIN_YEAR && year <= HOLIDAYS_MAX_YEAR;
};

/**
 * Adds a number of Brazilian business days (dias úteis) to a date.
 *
 * A business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a
 * Sunday, or a Brazilian holiday), evaluated with the same `stateCode`/`includeOptional`
 * options. The function walks one calendar day at a time, in the direction of `days`,
 * counting only business days, so it is exact regardless of the arrangement of holidays
 * around `date` (cheap in practice: `getHolidays` is memoized per year).
 *
 * `days: 0` returns a **new `Date` equal to `date`, unchanged**, even when `date` itself
 * falls on a weekend or holiday. This mirrors the verified behavior of date-fns'
 * `addBusinessDays(date, 0)`, which also returns the input date as-is rather than rolling
 * it to the next business day; see `@see` below. A negative `days` walks backwards, one
 * business day at a time, exactly like date-fns.
 *
 * The time-of-day (hours, minutes, seconds, milliseconds) of `date` is preserved in the
 * result, and `date` itself is never mutated.
 *
 * If `stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`).
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes. A `date`
 * outside it, or a walk that leaves it, returns `null`.
 *
 * @param {AddBusinessDaysParams} params - The parameters for the calculation.
 * @param {Date} params.date - The date to count from.
 * @param {number} params.days - The number of business days to add (negative to subtract).
 * @param {StateCode} [params.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [params.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {Date | null} A new `Date`, `days` business days after `date`. `null` on bad
 * input: a `params` that is not an object, a `date` that is not a valid `Date` or is outside
 * 1900-2099, a `days` that is not a finite integer, a `stateCode` that is not a string, or a
 * walk that leaves the supported years.
 *
 * @example
 * ```typescript
 * addBusinessDays({ date: new Date(2024, 0, 2, 12), days: 1 }); // Wed 2024-01-03, 12:00 (the next day is already a business day)
 * addBusinessDays({ date: new Date(2024, 11, 31, 12), days: 1 }); // Thu 2025-01-02, 12:00 (Jan 1 is Ano novo, skipped)
 * addBusinessDays({ date: new Date(2024, 0, 5, 12), days: -1 }); // Thu 2024-01-04, 12:00 (walks backwards)
 * addBusinessDays({ date: new Date(2024, 0, 6, 12), days: 0 }); // Sat 2024-01-06, 12:00 (unchanged, even though Saturday is not a business day)
 * addBusinessDays({ date: new Date("not a date"), days: 1 }); // null
 * addBusinessDays({ date: new Date(2024, 0, 2), days: 1.5 }); // null (not an integer)
 * addBusinessDays({ date: new Date(2099, 11, 31), days: 1 }); // null (the walk leaves the supported years)
 * addBusinessDays(null); // null
 * ```
 *
 * @see Based on: https://date-fns.org/docs/addBusinessDays Reference behavior for `days: 0` and
 * for walking backwards on a negative `days`. The underlying holiday determination's official
 * sources are cited in `isBusinessDay`/`getHolidays`.
 */
export const addBusinessDays = (params: AddBusinessDaysParams): Date | null => {
	if (isNullish(params) || typeof params !== "object") return null;

	const { date, days, stateCode, includeOptional } = params;

	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

	if (typeof days !== "number" || !Number.isFinite(days) || !Number.isInteger(days)) {
		return null;
	}

	if (stateCode !== undefined && typeof stateCode !== "string") return null;

	if (!isSupportedYear(date)) return null;

	const result = new Date(date.getTime());

	if (days === 0) return result;

	const hours = result.getHours();
	const step = days > 0 ? 1 : -1;
	let remaining = Math.abs(days);

	while (remaining > 0) {
		result.setDate(result.getDate() + step);

		if (!isSupportedYear(result)) return null;

		if (isBusinessDay(result, { stateCode, includeOptional })) {
			remaining -= 1;
		}
	}

	result.setHours(hours);

	return result;
};
