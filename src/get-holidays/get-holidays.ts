import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import type { StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import {
	CONSCIENCIA_NEGRA_HOLIDAY_NAME,
	CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
	FIXED_HOLIDAYS,
	type StateHolidayEntry,
	STATE_HOLIDAYS,
} from "./constants";

export type HolidayType = "national" | "state" | "optional" | "religious";

export type Holiday = {
	/** The holiday name in Brazilian Portuguese, e.g. `"Sexta-feira Santa"`. */
	name: string;
	/** The holiday date, at local midnight of the requested year. */
	date: Date;
	/** How the holiday is observed: national, state, optional (ponto facultativo) or religious. */
	type: HolidayType;
};

export type GetHolidaysOptions = {
	/** The four digit year to list holidays for. Must be an integer between 1900 and 2099. */
	year: number;
	/** Two letter state code whose state holidays are added to the national ones (default: national holidays only). */
	stateCode?: StateCode;
};

function calculateEaster(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);

	const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
	const day = ((h + l - 7 * m + 114) % 31) + 1;

	return new Date(year, month, day);
}

function calculateHolidayFromEaster(year: number, offset: number): Date {
	const easterDate = calculateEaster(year);
	const holidayDate = new Date(easterDate);
	holidayDate.setDate(easterDate.getDate() + offset);
	return holidayDate;
}

function resolveStateHolidayDate(
	year: number,
	{ day, month, easterOffset }: Pick<StateHolidayEntry, "day" | "month" | "easterOffset">,
): Date {
	if (easterOffset !== undefined) {
		return calculateHolidayFromEaster(year, easterOffset);
	}

	if (day !== undefined && month !== undefined) {
		return new Date(year, month - 1, day);
	}

	throw new Error(
		"State holiday entry must define either `easterOffset` or both `day` and `month`",
	);
}

let cache: Map<string, Holiday[]> | undefined;

const cloneHolidays = (holidays: Holiday[]): Holiday[] =>
	holidays.map((holiday) => ({ ...holiday, date: new Date(holiday.date) }));

const computeHolidays = (year: number, stateCode: StateCode | undefined): Holiday[] => {
	const holidays: Holiday[] = [];

	for (const [name, { day, month }] of Object.entries(FIXED_HOLIDAYS)) {
		holidays.push({
			name,
			date: new Date(year, month - 1, day),
			type: "national",
		});
	}

	if (year >= CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR) {
		holidays.push({
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			date: new Date(year, 10, 20),
			type: "national",
		});
	}

	const easterDate = calculateEaster(year);

	holidays.push(
		{
			name: "Carnaval (terça-feira)",
			date: calculateHolidayFromEaster(year, -47),
			type: "optional",
		},
		{
			name: "Sexta-feira Santa",
			date: calculateHolidayFromEaster(year, -2),
			type: "national",
		},
		{
			name: "Páscoa",
			date: easterDate,
			type: "religious",
		},
		{
			name: "Corpus Christi",
			date: calculateHolidayFromEaster(year, 60),
			type: "optional",
		},
	);

	// Stryker disable next-line ConditionalExpression: when stateCode is undefined, STATE_HOLIDAYS[stateCode] resolves to undefined too, so the inner `if (stateHolidays)` already no-ops either way
	if (stateCode !== undefined) {
		const stateHolidays = STATE_HOLIDAYS[stateCode];
		if (stateHolidays) {
			for (const entry of stateHolidays) {
				const { name, type, since, until } = entry;
				// Stryker disable next-line ConditionalExpression: `since` is undefined for most entries, and `year < undefined` is already always false, so the explicit `since !== undefined` guard never changes the outcome
				if (since !== undefined && year < since) continue;
				// Stryker disable next-line ConditionalExpression: `until` is undefined for most entries, and `year >= undefined` is already always false, so the explicit `until !== undefined` guard never changes the outcome
				if (until !== undefined && year >= until) continue;

				holidays.push({
					name,
					date: resolveStateHolidayDate(year, entry),
					type: type ?? "state",
				});
			}
		}
	}

	holidays.sort((a, b) => a.date.getTime() - b.date.getTime());

	return holidays;
};

/**
 * Retrieves all Brazilian holidays for a given year.
 *
 * The function returns both fixed holidays (that occur on the same date every year)
 * and movable holidays (that are calculated based on Easter Sunday).
 * If a state code is provided, state-specific holidays are also included.
 *
 * Holidays are returned sorted by date (chronological order). Results are memoized
 * per `year`/`stateCode` combination; the returned array (and each `Holiday.date`) is
 * always a fresh copy, so mutating it never affects subsequent calls.
 *
 * If `stateCode` is provided but is not a valid/known state code, it is ignored and
 * only national holidays are returned (this mirrors passing no `stateCode` at all,
 * and is kept for backwards compatibility).
 *
 * @param {number} year - The year for which to retrieve holidays (must be between 1900 and 2099)
 * @returns {Holiday[]} An array of holidays sorted by date
 *
 * @example
 * ```typescript
 * // Get all national holidays
 * const holidays = getHolidays(2024);
 *
 * // Get holidays for a specific state
 * const spHolidays = getHolidays({ year: 2024, stateCode: 'SP' });
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm National holidays law
 * (fixed and movable national holidays).
 * @see Official: state holiday laws are cited individually, one `@see` per holiday, in
 * `src/get-holidays/constants.ts`.
 * @see Based on: https://pt.wikipedia.org/wiki/Feriados_no_Brasil Used as secondary evidence for
 * some state holidays where no official law text was located (see constants.ts for which).
 */
export function getHolidays(year: number): Holiday[];
export function getHolidays(options: GetHolidaysOptions): Holiday[];
export function getHolidays(yearOrOptions: number | GetHolidaysOptions): Holiday[] {
	let year: number;
	let stateCode: StateCode | undefined;

	if (typeof yearOrOptions === "number") {
		year = yearOrOptions;
		stateCode = undefined;
	} else {
		// Stryker disable next-line BlockStatement: an empty block here still falls through to the `!Number.isInteger(year)` guard below, which returns [] anyway since `year` stays unassigned (undefined)
		if (isNullish(yearOrOptions) || typeof yearOrOptions !== "object") {
			return [];
		}
		year = yearOrOptions.year;
		stateCode = yearOrOptions.stateCode;
	}

	if (!Number.isInteger(year) || year < HOLIDAYS_MIN_YEAR || year > HOLIDAYS_MAX_YEAR) {
		return [];
	}

	const normalizedStateCode = typeof stateCode === "string" ? stateCode : undefined;

	// Stryker disable next-line StringLiteral: the exact fallback text is never observable outside this module; it only has to be a value no real StateCode equals, which any fixed string satisfies
	const cacheKey = `${year}|${normalizedStateCode ?? ""}`;

	cache ??= new Map<string, Holiday[]>();

	const cached = cache.get(cacheKey);
	if (cached) {
		return cloneHolidays(cached);
	}

	const holidays = computeHolidays(year, normalizedStateCode);
	cache.set(cacheKey, holidays);

	return cloneHolidays(holidays);
}
