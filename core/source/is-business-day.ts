import { getHolidays } from "./get-holidays";

const SATURDAY = 6;
const SUNDAY = 7;

/**
 * Whether a date is a Brazilian business day (dia útil).
 *
 * A day is not a business day when it falls on a weekend, or when it is one of the holidays
 * `getHolidays` lists for its year. `includeOptional` decides whether the ponto facultativo
 * entries (Carnaval, Corpus Christi) count; the published package defaults it to `true`, and
 * supplying that default is the DX's job.
 *
 * Only the years 1900 to 2099 are supported, the range the holiday rules are stated for.
 */
export function isBusinessDay(value: CivilDate, includeOptional: boolean): boolean {
	const year = date.year(value);

	if (year < 1900 || year > 2099) {
		return false;
	}

	const weekday = date.dayOfWeek(value);

	if (weekday === SATURDAY || weekday === SUNDAY) {
		return false;
	}

	for (const holiday of getHolidays(year)) {
		if (!includeOptional && holiday.type === "optional") {
			continue;
		}

		if (date.compare(holiday.date, value) === 0) {
			return false;
		}
	}

	return true;
}
