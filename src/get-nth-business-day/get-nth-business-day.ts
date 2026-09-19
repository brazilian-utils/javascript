import { isSupportedHolidayYear } from "../_internals/is-supported-holiday-year/is-supported-holiday-year";
import { isValidDate } from "../_internals/is-valid-date/is-valid-date";
import { type BusinessDayOptions, isBusinessDay } from "../is-business-day/is-business-day";

export type { BusinessDayOptions } from "../is-business-day/is-business-day";

/**
 * Gets the n-th Brazilian business day (dia útil) of the month a date falls in.
 *
 * A business day is a day for which `isBusinessDay` returns `true` (not a Saturday, a Sunday,
 * or a Brazilian holiday), evaluated with the same `options`. The month is the one of `date`'s
 * **local calendar day** (its local year and month, as read by `Date#getFullYear`/`getMonth`),
 * the convention every business day util shares; the day of the month and the time of day of
 * `date` are ignored.
 *
 * A positive `n` counts from the first day of the month (`1` is the first business day) and a
 * negative `n` counts from the last one (`-1` is the last business day, `-2` the one before
 * it), the way `Array#at` reads an index. `getLastBusinessDayOfMonth` is this function with an
 * `n` of `-1`. An `n` of `0`, or one beyond the number of business days the month has, returns
 * `null`: the answer never spills into a neighbouring month.
 *
 * The result is a new `Date` at the start of that local day (00:00:00.000), the same shape
 * date-fns' `lastDayOfMonth` returns, and `date` itself is never mutated.
 *
 * The signature follows the sibling business day utils, which follow date-fns:
 * `(date, n, options?)`, like `addBusinessDays(date, amount, options?)`.
 *
 * Mind the payroll deadline of CLT art. 459 § 1º ("até o quinto dia útil do mês subsequente ao
 * vencido"): labour inspection counts **Saturday as a business day** for that deadline
 * (Instrução Normativa MTP nº 2/2021, art. 14, I: "na contagem dos dias será incluído o sábado,
 * excluindo-se o domingo e o feriado, inclusive o municipal"), while `isBusinessDay`, and
 * therefore this function, never counts a Saturday and does not know municipal holidays. The
 * fifth business day returned here is the banking one, which can fall after the labour one.
 *
 * If `options.stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`/`isBusinessDay`), so a
 * prototype-chain key such as `"__proto__"` is an unknown state code like any other. An `options`
 * that is not an object at all is ignored, exactly as `isBusinessDay` ignores it.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a `date`
 * outside it returns `null`.
 *
 * @param {Date} date - Any date inside the month to look at. Never mutated: a new `Date` is returned.
 * @param {number} n - Which business day to get: `1` is the first of the month, `-1` the last.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {Date | null} A new `Date` at 00:00 local time of the n-th business day of the month.
 * `null` on bad input: a `date` that is not a valid `Date` or is outside 1900-2099, an `n` that is
 * not a finite integer, is `0` or goes beyond the business days of the month, or a `stateCode`
 * that is not a string.
 *
 * @example
 * ```typescript
 * getNthBusinessDay(new Date(2024, 0, 15), 1); // Tue 2024-01-02, 00:00 (Jan 1 is Ano novo)
 * getNthBusinessDay(new Date(2024, 0, 15), 5); // Mon 2024-01-08, 00:00
 * getNthBusinessDay(new Date(2024, 1, 1), 10); // Thu 2024-02-15, 00:00 (Carnaval, Feb 13, skipped)
 * getNthBusinessDay(new Date(2024, 1, 1), 10, { includeOptional: false }); // Wed 2024-02-14, 00:00
 * getNthBusinessDay(new Date(2024, 6, 1), 7, { stateCode: "SP" }); // Wed 2024-07-10, 00:00 (Jul 9 is a state holiday in SP)
 * getNthBusinessDay(new Date(2024, 0, 15), -1); // Wed 2024-01-31, 00:00 (the last business day)
 * getNthBusinessDay(new Date(2024, 0, 15), -2); // Tue 2024-01-30, 00:00
 * getNthBusinessDay(new Date(2024, 0, 15), 23); // null (January 2024 has 22 business days)
 * getNthBusinessDay(new Date(2024, 0, 15), 0); // null
 * getNthBusinessDay(new Date("not a date"), 1); // null
 * getNthBusinessDay(new Date(2100, 0, 15), 1); // null (outside the supported years)
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm
 * CLT art. 459 § 1º, the "quinto dia útil" payroll deadline that motivates the util.
 * @see Official: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/in-2-de-8-denovembro-de-2021.pdf
 * Instrução Normativa MTP nº 2/2021, art. 14, I: Saturday counts towards that labour deadline,
 * which is why the caveat above exists.
 * @see Based on: https://unpkg.com/date-fns@4.1.0/lastDayOfMonth.js
 * Reference for returning the start of the local day and for never mutating the input. The
 * underlying holiday determination's official sources are cited in `isBusinessDay`/`getHolidays`.
 */
export const getNthBusinessDay = (
	date: Date,
	n: number,
	options?: BusinessDayOptions,
): Date | null => {
	if (!isValidDate(date)) return null;

	if (!Number.isInteger(n)) return null;

	const year = date.getFullYear();

	if (!isSupportedHolidayYear(year)) return null;

	const month = date.getMonth();
	// Stryker disable next-line EqualityOperator: when n is 0, remaining never reaches 0 below and the walk returns null from either end of the month, so > vs >= here is unobservable
	const step = n > 0 ? 1 : -1;
	const result = step === 1 ? new Date(year, month, 1) : new Date(year, month + 1, 0);
	let remaining = Math.abs(n);

	while (result.getMonth() === month) {
		if (isBusinessDay(result, options)) {
			remaining -= 1;

			if (remaining === 0) return result;
		}

		result.setDate(result.getDate() + step);
	}

	return null;
};
