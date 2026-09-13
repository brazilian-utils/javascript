import { applyWordsCase } from "../_internals/apply-words-case/apply-words-case";
import { MONTH_NAMES, WEEKDAY_NAMES } from "../_internals/constants/number-words";
import { numberToWords, type WordsCase } from "../_internals/number-to-words/number-to-words";

/** Options of `convertDateToWords`. */
export type ConvertDateToWordsOptions = {
	/** Letter case applied to the result: `"lower"` (unchanged), `"sentence"` (capitalizes only the first letter) or `"upper"` (uppercases everything, keeping accents). Defaults to `"lower"`; an invalid value is ignored and `"lower"` is used instead. */
	case?: WordsCase;
	/** Output style: `"full"` spells out the day, month and year (`"dois de março de dois mil e vinte e quatro"`); `"month"` spells out only the month name and leaves the day and year as digits (`"2 de março de 2024"`, day 1 as `"1º"`). Defaults to `"full"`; an invalid value is ignored and `"full"` is used instead. */
	style?: "full" | "month";
	/** Prefixes the pt-BR weekday name (lowercase) followed by a comma, e.g. `"sábado, dois de março de dois mil e vinte e quatro"`. The weekday is derived from the resolved calendar date (the `Date`'s local calendar date, or the parsed civil date for a string). Defaults to `false`. */
	weekday?: boolean;
};

const BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (year: number): boolean =>
	year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number =>
	month === 2 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month - 1];

const getWeekdayIndex = (year: number, month: number, day: number): number => {
	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);
	return date.getUTCDay();
};

const dayToWords = (day: number, monthStyle: boolean): string => {
	if (monthStyle) return day === 1 ? "1º" : String(day);
	return day === 1 ? "primeiro" : numberToWords(day);
};

/**
 * Formats a date as its Brazilian Portuguese "por extenso" textual representation, e.g.
 * `"01/01/2024"` becomes `"primeiro de janeiro de dois mil e vinte e quatro"`.
 *
 * `value` can be a `Date` (read by its **local calendar date**, i.e. `getFullYear`/`getMonth`/
 * `getDate`, not its underlying UTC instant, the same convention used by `isHoliday`) or a
 * string in `"dd/mm/yyyy"` or ISO `"yyyy-mm-dd"` format, both parsed as plain calendar dates
 * with no timezone conversion. With the default `"full"` `options.style`, day 1 is written as
 * "primeiro" and every other day uses the cardinal number; with `"month"`, only the month name
 * is spelled out and the day/year are written as digits (day 1 as `"1º"`). Month names are
 * lowercase. In `"full"` style the year is written out as a cardinal number without the
 * thousands comma that `convertNumberToWords`/`convertCurrencyToWords` use (`1999` reads as
 * `"mil novecentos e noventa e nove"`, not `"mil, novecentos e noventa e nove"`), matching how a
 * date is read aloud. `options.weekday` prefixes the pt-BR weekday name (lowercase) followed by
 * a comma. February 29th is accepted on the leap years of the proleptic Gregorian calendar
 * (divisible by 4, except centuries that are not divisible by 400). Returns `""` when `value` is
 * not one of those forms, is an invalid `Date`, names a day/month that does not exist (e.g.
 * `"31/04/2024"` or `"29/02/2023"`), or falls before year 1, which has no year to write out.
 *
 * @param {Date|string} value - The date to convert: a `Date`, `"dd/mm/yyyy"` or ISO `"yyyy-mm-dd"`.
 * @param {ConvertDateToWordsOptions} [options] - Optional formatting options.
 * @param {WordsCase} [options.case] - Letter case applied to the result. Defaults to `"lower"`.
 * @param {"full"|"month"} [options.style] - Output style. Defaults to `"full"`.
 * @param {boolean} [options.weekday] - Prefixes the pt-BR weekday name and a comma. Defaults to `false`.
 * @returns {string} The date written out in Portuguese, or `""` for invalid input.
 *
 * @example
 * ```typescript
 * convertDateToWords("01/01/2024"); // "primeiro de janeiro de dois mil e vinte e quatro"
 * convertDateToWords("2024-01-02"); // "dois de janeiro de dois mil e vinte e quatro"
 * convertDateToWords(new Date(2024, 0, 1)); // "primeiro de janeiro de dois mil e vinte e quatro"
 * convertDateToWords("01/01/2024", { case: "sentence" }); // "Primeiro de janeiro de dois mil e vinte e quatro"
 * convertDateToWords("02/03/2024", { style: "month" }); // "2 de março de 2024"
 * convertDateToWords("01/01/2024", { style: "month" }); // "1º de janeiro de 2024"
 * convertDateToWords("02/03/2024", { weekday: true }); // "sábado, dois de março de dois mil e vinte e quatro"
 * convertDateToWords("10/05/1999"); // "dez de maio de mil novecentos e noventa e nove"
 * convertDateToWords("31/04/2024"); // "" (April has 30 days)
 * convertDateToWords("invalid"); // ""
 * ```
 *
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/date_utils.py
 */
export const convertDateToWords = (
	value: Date | string,
	options?: ConvertDateToWordsOptions,
): string => {
	let year: number;
	let month: number;
	let day: number;

	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return "";

		year = value.getFullYear();
		month = value.getMonth() + 1;
		day = value.getDate();
	} else if (typeof value === "string") {
		const brMatch = BR_DATE_REGEX.exec(value);
		const isoMatch = ISO_DATE_REGEX.exec(value);

		if (brMatch) {
			day = Number(brMatch[1]);
			month = Number(brMatch[2]);
			year = Number(brMatch[3]);
		} else if (isoMatch) {
			year = Number(isoMatch[1]);
			month = Number(isoMatch[2]);
			day = Number(isoMatch[3]);
		} else {
			return "";
		}
	} else {
		return "";
	}

	if (year < 1) return "";
	if (month < 1 || month > 12) return "";
	if (day < 1 || day > daysInMonth(year, month)) return "";

	const monthName = MONTH_NAMES[month - 1];
	const isMonthStyle = options?.style === "month";

	const yearWords = isMonthStyle ? String(year) : numberToWords(year).replaceAll(", ", " ");
	const dateWords = `${dayToWords(day, isMonthStyle)} de ${monthName} de ${yearWords}`;

	const result =
		options?.weekday === true
			? `${WEEKDAY_NAMES[getWeekdayIndex(year, month, day)]}, ${dateWords}`
			: dateWords;

	return applyWordsCase(result, options?.case);
};
