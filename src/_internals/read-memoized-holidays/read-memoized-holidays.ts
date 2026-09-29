import {
	ELECTION_DATE_OVERRIDES,
	ELECTION_HOLIDAY_NAME,
	ELECTION_SINCE_YEAR,
	FIXED_HOLIDAYS,
	type HolidayPeriod,
	STATE_HOLIDAYS,
} from "../../get-holidays/constants";
import { type Holiday, type HolidayType } from "../../get-holidays/get-holidays";
import { type StateCode } from "../constants/states";
import { resolveStateHolidayDate } from "../resolve-state-holiday-date/resolve-state-holiday-date";

/**
 * A holiday as the memo keeps it. A holiday is a local calendar day, so the memo keeps the year,
 * month and day rather than the `Date` built from them: a `Date` is an instant, and the same
 * instant falls on another local day once the process time zone changes, which would make a
 * memoized year answer for the wrong days.
 */
export type MemoizedHoliday = {
	/** The holiday name in Brazilian Portuguese. */
	name: string;
	/** How the holiday is observed. */
	type: HolidayType;
	/** The four digit year. */
	year: number;
	/** The zero based month, as `Date#getMonth` counts it. */
	month: number;
	/** The day of the month. */
	day: number;
};

const cache: Record<string, MemoizedHoliday[] | undefined> = {};

const memoizeHolidays = (holidays: Holiday[]): MemoizedHoliday[] =>
	holidays.map(({ name, type, date }) => ({
		name,
		type,
		year: date.getFullYear(),
		month: date.getMonth(),
		day: date.getDate(),
	}));

/**
 * Whether a holiday entry is in force in `year`: from its `since` (inclusive) up to its `until`
 * (exclusive), an absent bound leaving that side open.
 *
 * @param {number} year - The year being computed.
 * @param {HolidayPeriod} period - The entry's bounds.
 * @returns {boolean} `true` when the entry applies to `year`.
 */
const isInForce = (year: number, { since, until }: HolidayPeriod): boolean => {
	// Stryker disable next-line ConditionalExpression: `since` is undefined for most entries, and `year < undefined` is already always false, so the explicit `since !== undefined` guard never changes the outcome
	if (since !== undefined && year < since) return false;
	// Stryker disable next-line ConditionalExpression: `until` is undefined for most entries, and `year >= undefined` is already always false, so the explicit `until !== undefined` guard never changes the outcome
	if (until !== undefined && year >= until) return false;

	return true;
};

const DAYS_IN_WEEK = 7;
const OCTOBER = 9;

/**
 * The date of the first round of the elections of `year`: the first Sunday of October, unless
 * `ELECTION_DATE_OVERRIDES` carries another date for that year. Sunday is weekday 0, so the days
 * from 1 October to the first Sunday are 7 minus its weekday, or none when 1 October is already a
 * Sunday.
 *
 * @param {number} year - An even year from `ELECTION_SINCE_YEAR` on.
 * @returns {Date} The election day, at local midnight.
 */
const resolveElectionDate = (year: number): Date => {
	const override = ELECTION_DATE_OVERRIDES[year];

	if (override !== undefined) return new Date(year, override[0] - 1, override[1]);

	const firstOfOctober = new Date(year, OCTOBER, 1).getDay();

	return new Date(year, OCTOBER, 1 + ((DAYS_IN_WEEK - firstOfOctober) % DAYS_IN_WEEK));
};

/**
 * The holidays of `year`, national and then the ones of `stateCode`, sorted by date. The caller
 * passes a state code or `undefined` (`readHolidayStateCode` rejected everything else), so a
 * prototype chain key never reaches the state lookup. Name and date together are the identity of
 * a holiday: a state entry only replaces a national one when both match, so DF's Corpus Christi
 * replaces the national optional one while its Fundação de Brasília is listed next to Tiradentes,
 * which falls on the same 21 April under a different name.
 *
 * @param {number} year - The year, already checked to be supported.
 * @param {StateCode | undefined} stateCode - The state whose holidays are added, if any.
 * @returns {Holiday[]} The holidays of the year.
 */
const computeHolidays = (year: number, stateCode: StateCode | undefined): Holiday[] => {
	const holidays: Holiday[] = [];

	for (const entry of FIXED_HOLIDAYS) {
		if (!isInForce(year, entry)) continue;

		holidays.push({
			name: entry.name,
			date: new Date(year, entry.month - 1, entry.day),
			type: "national",
		});
	}

	if (year >= ELECTION_SINCE_YEAR && year % 2 === 0) {
		holidays.push({
			name: ELECTION_HOLIDAY_NAME,
			date: resolveElectionDate(year),
			type: "national",
		});
	}

	const easterDate = resolveStateHolidayDate(year, { easterOffset: 0 });

	holidays.push(
		{
			name: "Carnaval (segunda-feira)",
			date: resolveStateHolidayDate(year, { easterOffset: -48 }),
			type: "optional",
		},
		{
			name: "Carnaval (terça-feira)",
			date: resolveStateHolidayDate(year, { easterOffset: -47 }),
			type: "optional",
		},
		{
			name: "Sexta-feira Santa",
			date: resolveStateHolidayDate(year, { easterOffset: -2 }),
			type: "national",
		},
		{
			name: "Páscoa",
			date: easterDate,
			type: "religious",
		},
		{
			name: "Corpus Christi",
			date: resolveStateHolidayDate(year, { easterOffset: 60 }),
			type: "optional",
		},
	);

	// Stryker disable next-line ConditionalExpression: `STATE_HOLIDAYS` has no "undefined" key, so indexing it with `undefined` also gives `undefined`; the check only narrows the type.
	const stateHolidays = stateCode === undefined ? undefined : STATE_HOLIDAYS[stateCode];

	if (stateHolidays) {
		for (const entry of stateHolidays) {
			if (!isInForce(year, entry)) continue;

			const { name, type } = entry;
			const date = resolveStateHolidayDate(year, entry);
			const stateHoliday: Holiday = { name, date, type: type ?? "state" };
			const stateHolidayKey = `${name}|${date.getTime()}`;
			const nationalIndex = holidays.findIndex(
				(holiday) => `${holiday.name}|${holiday.date.getTime()}` === stateHolidayKey,
			);

			if (nationalIndex === -1) {
				holidays.push(stateHoliday);
			} else {
				holidays[nationalIndex] = stateHoliday;
			}
		}
	}

	holidays.sort((a, b) => a.date.getTime() - b.date.getTime());

	return holidays;
};

/**
 * Reads the memoized holidays of a supported year, computing them on first use. The entries are
 * shared between calls, so a caller must only read them.
 *
 * @param {number} year - A year the holiday tables cover.
 * @param {StateCode|undefined} stateCode - A state code already read, or `undefined` for the national list.
 * @returns {readonly MemoizedHoliday[]} The shared holidays of the year, in date order.
 */
export const readMemoizedHolidays = (
	year: number,
	stateCode?: StateCode,
): readonly MemoizedHoliday[] => {
	// Stryker disable next-line StringLiteral: the exact fallback text is never observable outside this module; it only has to be a value no real StateCode equals, which any fixed string satisfies
	const cacheKey = `${year}|${stateCode ?? ""}`;

	cache[cacheKey] ??= memoizeHolidays(computeHolidays(year, stateCode));

	return cache[cacheKey];
};
