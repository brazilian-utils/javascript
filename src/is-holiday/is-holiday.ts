import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { getHolidays } from "../get-holidays/get-holidays";

/** The options `isHoliday` takes: the date to check and, optionally, the state whose holidays also count. */
export type IsHolidayOptions = {
	/** The date to check, read by its local calendar day. */
	targetDate: Date;
	/** Two letter state code whose state holidays are also considered (default: national holidays only). */
	stateCode?: StateCode;
};

/**
 * Checks whether a given date is a Brazilian holiday.
 *
 * The check is based on `targetDate`'s **local calendar date** (its local year/month/day,
 * as read by `Date#getFullYear`/`getMonth`/`getDate`), not its underlying UTC instant.
 * This matters because `new Date("2024-12-25")` (a date-only ISO string) is parsed as UTC
 * midnight, which in timezones behind UTC (e.g. America/Sao_Paulo, UTC-3) represents
 * "2024-12-24" in local time, so build `targetDate` from local components
 * (`new Date(2024, 11, 25)`) or from a full ISO datetime when you mean a specific local day.
 *
 * If `stateCode` is provided but is not a valid/known state code, it is ignored and only
 * national holidays are considered (same behavior as `getHolidays`).
 *
 * @param {IsHolidayOptions} [options] - Options for the check.
 * @param {Date} options.targetDate - The date to check.
 * @param {StateCode} [options.stateCode] - Optional Brazilian state code to also consider state holidays.
 * @returns {boolean} True when the date is a holiday, false otherwise. Bad input also returns
 * false: missing `options`, a `targetDate` that is not a valid `Date`, or a non-string
 * `stateCode`.
 *
 * @example
 * ```typescript
 * isHoliday({ targetDate: new Date(2024, 0, 1) }); // true (Ano novo)
 * isHoliday({ targetDate: new Date(2024, 5, 10) }); // false
 * isHoliday(); // false
 * ```
 *
 * The underlying national holidays are the ones `getHolidays` computes; see its JSDoc (and
 * `src/get-holidays/constants.ts` for state holidays) for the full set of laws behind them.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm Lei 662/1949, the base
 * national holidays law.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm Lei 10.607/2002,
 * added Tiradentes and Finados.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm Lei 6.802/1980, declared
 * Nossa Senhora Aparecida a national holiday.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm Lei
 * 14.759/2023, nationalized Dia da Consciência Negra from 2024.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9093.htm Lei 9.093/1995, the
 * framework law authorizing state and municipal holidays.
 */
export const isHoliday = (options?: IsHolidayOptions): boolean => {
	if (isNullish(options) || typeof options !== "object") {
		return false;
	}

	const { targetDate, stateCode } = options;

	if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
		return false;
	}

	if (stateCode !== undefined && typeof stateCode !== "string") {
		return false;
	}

	const year = targetDate.getFullYear();
	return getHolidays({ year, stateCode }).some(
		(holiday) =>
			holiday.date.getMonth() === targetDate.getMonth() &&
			holiday.date.getDate() === targetDate.getDate(),
	);
};
