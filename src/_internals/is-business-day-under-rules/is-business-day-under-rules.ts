import { isSupportedHolidayYear } from "../is-supported-holiday-year/is-supported-holiday-year";
import { type BusinessDayRules } from "../read-business-day-rules/read-business-day-rules";
import { readMemoizedHolidays } from "../read-memoized-holidays/read-memoized-holidays";

const SUNDAY = 0;
const SATURDAY = 6;

/**
 * Tells whether a valid date is a business day under rules already read.
 *
 * @param {Date} value - A valid date.
 * @param {BusinessDayRules} rules - The rules read from the options.
 * @returns {boolean} `true` when the date is a business day.
 */
export const isBusinessDayUnderRules = (value: Date, rules: BusinessDayRules): boolean => {
	const year = value.getFullYear();

	if (!isSupportedHolidayYear(year)) return false;

	const day = value.getDay();

	if (day === SUNDAY) return false;

	if (day === SATURDAY && !rules.includeSaturday) return false;

	const month = value.getMonth();
	const date = value.getDate();
	const { includeOptional } = rules;

	return !readMemoizedHolidays(year, rules.stateCode).some((holiday) => {
		if (!includeOptional && holiday.type === "optional") return false;

		return holiday.month === month && holiday.day === date;
	});
};
