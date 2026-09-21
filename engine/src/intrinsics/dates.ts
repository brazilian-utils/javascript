/**
 * `date`: the proleptic Gregorian calendar, years 1 to 9999, with no zone and no clock.
 *
 * `CivilDate` and `Instant` are never interchangeable: converting between them needs a time zone,
 * which is deferred until a utility needs one. A host `Date` is the DX's problem, not the core's.
 */

import { tBool, tCivilDate, tInt, tOption } from "../types.ts";
import { NONE, asBigInt, asDate, civilDate, some } from "../values.ts";
import { defineIntrinsic, expectArity, expectKind } from "./registry.ts";

export const MIN_EPOCH_DAY = -719_162; // 0001-01-01
export const MAX_EPOCH_DAY = 2_932_896; // 9999-12-31

/** Days from the Unix epoch, after Howard Hinnant's `days_from_civil`. */
export function epochDaysFromYmd(year: number, month: number, day: number): number {
	const shifted = year - (month <= 2 ? 1 : 0);
	const era = Math.floor(shifted / 400);
	const yearOfEra = shifted - era * 400;
	const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
	const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
	return era * 146_097 + dayOfEra - 719_468;
}

export function ymdFromEpochDays(days: number): { year: number; month: number; day: number } {
	const shifted = days + 719_468;
	const era = Math.floor(shifted / 146_097);
	const dayOfEra = shifted - era * 146_097;
	const yearOfEra = Math.floor(
		(dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36_524) - Math.floor(dayOfEra / 146_096)) / 365,
	);
	const year = yearOfEra + era * 400;
	const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
	const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
	const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
	const month = monthPrime + (monthPrime < 10 ? 3 : -9);
	return { year: year + (month <= 2 ? 1 : 0), month, day };
}

export function isValidYmd(year: number, month: number, day: number): boolean {
	if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
	const roundTrip = ymdFromEpochDays(epochDaysFromYmd(year, month, day));
	return roundTrip.year === year && roundTrip.month === month && roundTrip.day === day;
}

defineIntrinsic({
	name: "date.fromYmd",
	doc: "A civil date, or `none` when the components do not name a real day. Never rolls over.",
	signature: (args) => {
		expectArity("date.fromYmd", args, 3);
		expectKind("date.fromYmd", args, 0, "Int");
		expectKind("date.fromYmd", args, 1, "Int");
		expectKind("date.fromYmd", args, 2, "Int");
		return tOption(tCivilDate);
	},
	evaluate: ([year, month, day]) => {
		const y = Number(asBigInt(year!));
		const m = Number(asBigInt(month!));
		const d = Number(asBigInt(day!));
		return isValidYmd(y, m, d) ? some(civilDate(epochDaysFromYmd(y, m, d))) : NONE;
	},
});

defineIntrinsic({
	name: "date.fromEpochDays",
	doc: "A civil date from days since 1970-01-01, or `none` outside years 1 to 9999.",
	signature: (args) => {
		expectArity("date.fromEpochDays", args, 1);
		expectKind("date.fromEpochDays", args, 0, "Int");
		return tOption(tCivilDate);
	},
	evaluate: ([days]) => {
		const value = Number(asBigInt(days!));
		return value < MIN_EPOCH_DAY || value > MAX_EPOCH_DAY ? NONE : some(civilDate(value));
	},
});

defineIntrinsic({
	name: "date.clampEpochDays",
	doc: "A civil date from days since 1970-01-01, clamped into years 1 to 9999. Total, so it needs no Option.",
	signature: (args) => {
		expectArity("date.clampEpochDays", args, 1);
		expectKind("date.clampEpochDays", args, 0, "Int");
		return tCivilDate;
	},
	evaluate: ([days]) => {
		const value = Number(asBigInt(days!));
		return civilDate(Math.min(Math.max(value, MIN_EPOCH_DAY), MAX_EPOCH_DAY));
	},
});

defineIntrinsic({
	name: "date.toEpochDays",
	doc: "Days since 1970-01-01.",
	signature: (args) => {
		expectArity("date.toEpochDays", args, 1);
		expectKind("date.toEpochDays", args, 0, "CivilDate");
		return tInt(BigInt(MIN_EPOCH_DAY), BigInt(MAX_EPOCH_DAY));
	},
	evaluate: ([date]) => BigInt(asDate(date!).days),
});

for (const [op, index] of [
	["year", 0],
	["month", 1],
	["day", 2],
] as const) {
	defineIntrinsic({
		name: `date.${op}`,
		doc: `The ${op} component of a civil date.`,
		signature: (args) => {
			expectArity(`date.${op}`, args, 1);
			expectKind(`date.${op}`, args, 0, "CivilDate");
			return index === 0 ? tInt(1n, 9999n) : index === 1 ? tInt(1n, 12n) : tInt(1n, 31n);
		},
		evaluate: ([date]) => {
			const parts = ymdFromEpochDays(asDate(date!).days);
			return BigInt(index === 0 ? parts.year : index === 1 ? parts.month : parts.day);
		},
	});
}

defineIntrinsic({
	name: "date.addDays",
	doc: "Shifts by a number of days, or `none` when the result leaves years 1 to 9999.",
	signature: (args) => {
		expectArity("date.addDays", args, 2);
		expectKind("date.addDays", args, 0, "CivilDate");
		expectKind("date.addDays", args, 1, "Int");
		return tOption(tCivilDate);
	},
	evaluate: ([date, days]) => {
		const shifted = asDate(date!).days + Number(asBigInt(days!));
		return shifted < MIN_EPOCH_DAY || shifted > MAX_EPOCH_DAY ? NONE : some(civilDate(shifted));
	},
});

defineIntrinsic({
	name: "date.diffDays",
	doc: "Exact day difference: `a - b`.",
	signature: (args) => {
		expectArity("date.diffDays", args, 2);
		expectKind("date.diffDays", args, 0, "CivilDate");
		expectKind("date.diffDays", args, 1, "CivilDate");
		const span = BigInt(MAX_EPOCH_DAY - MIN_EPOCH_DAY);
		return tInt(-span, span);
	},
	evaluate: ([left, right]) => BigInt(asDate(left!).days - asDate(right!).days),
});

defineIntrinsic({
	name: "date.dayOfWeek",
	doc: "ISO day of week: Monday is 1 through Sunday is 7.",
	signature: (args) => {
		expectArity("date.dayOfWeek", args, 1);
		expectKind("date.dayOfWeek", args, 0, "CivilDate");
		return tInt(1n, 7n);
	},
	evaluate: ([date]) => {
		const days = asDate(date!).days;
		// 1970-01-01 was a Thursday (ISO 4).
		return BigInt(((((days + 3) % 7) + 7) % 7) + 1);
	},
});

defineIntrinsic({
	name: "date.compare",
	doc: "Chronological comparison: -1, 0 or 1.",
	signature: (args) => {
		expectArity("date.compare", args, 2);
		expectKind("date.compare", args, 0, "CivilDate");
		expectKind("date.compare", args, 1, "CivilDate");
		return tInt(-1n, 1n);
	},
	evaluate: ([left, right]) => {
		const a = asDate(left!).days;
		const b = asDate(right!).days;
		return a < b ? -1n : a > b ? 1n : 0n;
	},
});

defineIntrinsic({
	name: "date.isLeapYear",
	doc: "Whether a year has 366 days in the proleptic Gregorian calendar.",
	signature: (args) => {
		expectArity("date.isLeapYear", args, 1);
		expectKind("date.isLeapYear", args, 0, "Int");
		return tBool;
	},
	evaluate: ([year]) => {
		const value = Number(asBigInt(year!));
		return (value % 4 === 0 && value % 100 !== 0) || value % 400 === 0;
	},
});
