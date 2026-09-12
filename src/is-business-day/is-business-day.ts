import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import type { StateCode } from "../_internals/constants/states";
import { getHolidays } from "../get-holidays/get-holidays";

export type IsBusinessDayOptions = {
	/** Two letter state code whose state holidays are also treated as non-business days (default: national holidays only). */
	stateCode?: StateCode;
	/** Whether optional-type holidays (`Holiday.type === "optional"`, e.g. Carnaval, Corpus Christi) count as non-business days (default: `true`, matching Brazilian banking practice, where these days are not settlement days). */
	includeOptional?: boolean;
};

const WEEKEND_DAYS = [0, 6];

/**
 * Checks whether a given date is a Brazilian business day (dia útil).
 *
 * A day is not a business day when it falls on Saturday or Sunday, or when it is a
 * Brazilian holiday returned by `getHolidays({ year, stateCode })` for `value`'s **local
 * calendar day** (its local year/month/day, as read by `Date#getFullYear`/`getMonth`/`getDate`),
 * the same convention used by `isHoliday`. Build `value` from local components
 * (`new Date(2024, 11, 25)`) rather than from a date-only ISO string when you mean a
 * specific local day, for the same reason documented in `isHoliday`.
 *
 * `options.includeOptional` defaults to `true`: holidays whose `Holiday.type` is
 * `"optional"` (Carnaval and Corpus Christi) are treated as non-business days, matching
 * the Brazilian banking calendar (FEBRABAN/CMN), where these days are not settlement days
 * even though they are not statutory holidays. Pass `false` to only treat statutory
 * (`"national"` and `"state"`) holidays as non-business days.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored
 * and only national holidays are considered (same behavior as `getHolidays`/`isHoliday`).
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date
 * outside it returns `false` rather than silently treating every weekday as a business day.
 *
 * @param {Date} value - The date to check.
 * @param {IsBusinessDayOptions} [options] - Options for the check.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {boolean} True when `value` is a business day, false otherwise. Bad input also
 * returns false: a `value` that is not a valid `Date` (including non-`Date` values) or a
 * `value` outside the supported 1900-2099 range.
 *
 * @example
 * ```typescript
 * isBusinessDay(new Date(2024, 0, 2)); // true (Tuesday, not a holiday)
 * isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
 * isBusinessDay(new Date(2024, 0, 6)); // false (Saturday)
 * isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval, optional holiday, banking practice)
 * isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
 * isBusinessDay(new Date(2024, 6, 9), { stateCode: "SP" }); // false (Revolução Constitucionalista)
 * isBusinessDay(new Date(2024, 6, 9)); // true (state holiday ignored without stateCode)
 * isBusinessDay(new Date("not a date")); // false
 * isBusinessDay(new Date(2100, 0, 4)); // false (a Monday, but 2100 is outside the supported range)
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm
 */
export const isBusinessDay = (value: Date, options?: IsBusinessDayOptions): boolean => {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;

	const year = value.getFullYear();

	if (year < HOLIDAYS_MIN_YEAR || year > HOLIDAYS_MAX_YEAR) return false;

	if (WEEKEND_DAYS.includes(value.getDay())) return false;

	const stateCode = options?.stateCode;
	const includeOptional = options?.includeOptional ?? true;

	const month = value.getMonth();
	const date = value.getDate();

	return !getHolidays({ year, stateCode }).some((holiday) => {
		if (!includeOptional && holiday.type === "optional") return false;

		return holiday.date.getMonth() === month && holiday.date.getDate() === date;
	});
};
