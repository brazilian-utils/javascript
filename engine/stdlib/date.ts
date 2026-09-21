/**
 * Civil date arithmetic, written once in the source language.
 *
 * `CivilDate` is days since 1970-01-01 in every target, so the calendar itself never depends on a
 * host library: the algorithms below (Howard Hinnant's `days_from_civil` and `civil_from_days`)
 * are exact for the proleptic Gregorian calendar and identical everywhere.
 */

/** Floor division, which the calendar algorithms need for negative years. */
export function floorDiv(value: IntRange<-4000000, 4000000>, divisor: IntRange<1, 146097>): Int {
	const quotient = value / divisor;

	if (value < 0 && quotient * divisor !== value) {
		return quotient - 1;
	}

	return quotient;
}

/** Days since 1970-01-01 for a year, month and day already known to be a real date. */
export function daysFromCivil(
	year: IntRange<1, 9999>,
	month: IntRange<1, 12>,
	day: IntRange<1, 31>,
): IntRange<-719162, 2932896> {
	const shifted = month <= 2 ? year - 1 : year;
	const era = floorDiv(shifted, 400);
	const yearOfEra = shifted - era * 400;
	const monthTerm = month > 2 ? month - 3 : month + 9;
	const dayOfYear = (153 * monthTerm + 2) / 5 + day - 1;
	const dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;

	// Interval analysis cannot prove the calendar identity behind this algorithm, so the result is
	// clamped to the range the type promises. For a real date the clamp never fires; for anything
	// else it keeps the function total, which is what lets every caller stay provably safe.
	return int.min(int.max(era * 146097 + dayOfEra - 719468, -719162), 2932896);
}

/** The year of a date given as days since 1970-01-01. */
export function yearFromDays(days: IntRange<-719162, 2932896>): IntRange<1, 9999> {
	const shifted = days + 719468;
	const era = floorDiv(shifted, 146097);
	const dayOfEra = shifted - era * 146097;
	const yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
	const year = yearOfEra + era * 400;
	const dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
	const monthPrime = (5 * dayOfYear + 2) / 153;
	const month = monthPrime < 10 ? monthPrime + 3 : monthPrime - 9;

	return int.min(int.max(month <= 2 ? year + 1 : year, 1), 9999);
}

/** The month of a date given as days since 1970-01-01. */
export function monthFromDays(days: IntRange<-719162, 2932896>): IntRange<1, 12> {
	const shifted = days + 719468;
	const era = floorDiv(shifted, 146097);
	const dayOfEra = shifted - era * 146097;
	const yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
	const dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
	const monthPrime = (5 * dayOfYear + 2) / 153;

	return int.min(int.max(monthPrime < 10 ? monthPrime + 3 : monthPrime - 9, 1), 12);
}

/** The day of month of a date given as days since 1970-01-01. */
export function dayFromDays(days: IntRange<-719162, 2932896>): IntRange<1, 31> {
	const shifted = days + 719468;
	const era = floorDiv(shifted, 146097);
	const dayOfEra = shifted - era * 146097;
	const yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
	const dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
	const monthPrime = (5 * dayOfYear + 2) / 153;

	return int.min(int.max(dayOfYear - (153 * monthPrime + 2) / 5 + 1, 1), 31);
}

/** Whether a year, month and day name a real date on the proleptic Gregorian calendar. */
export function isRealDate(year: Int, month: Int, day: Int): boolean {
	return ymdToDays(year, month, day) !== undefined;
}

/**
 * Days since 1970-01-01, or absent when the components do not name a real date.
 *
 * The bounds are checked here rather than in a helper because the checker reads a guard, not a
 * called predicate: after this `if`, the three components carry the ranges `daysFromCivil`
 * requires, and the round trip rejects a day the month does not have.
 */
export function ymdToDays(year: Int, month: Int, day: Int): Int | undefined {
	if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
		return undefined;
	}

	const days = daysFromCivil(year, month, day);

	if (yearFromDays(days) !== year || monthFromDays(days) !== month || dayFromDays(days) !== day) {
		return undefined;
	}

	return days;
}
