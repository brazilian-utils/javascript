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
 * An invalid `stateCode` is treated in two different ways, depending on its type:
 *
 * - a string that is not a known state code is ignored, and only national holidays are
 *   considered, the same behavior as `getHolidays`. The lookup is an own-property one, so a
 *   prototype-chain key such as `"__proto__"` or `"constructor"` is an unknown state code like
 *   any other;
 * - a `stateCode` that is present and is not a string at all (a number, `null`, an object) is
 *   rejected rather than ignored: `isHoliday` returns `false` without looking at the date, even
 *   when that date is a national holiday. `undefined`, or an absent property, is the only
 *   non-string value that stands for "no state" instead.
 *
 * The date a state holiday is checked against is the statutory one, except for Santa Catarina's
 * two holidays, which `getHolidays` moves to the following Sunday when they fall Monday to
 * Friday: 11 August from 2005 on, as Lei SC nº 13.408/2005 introduced, and 25 November from 1999
 * on, as Lei SC nº 11.213/1999 introduced, save for 2004, the year art. 3º of Lei SC nº
 * 12.906/2004 left that date without a transfer clause. Lei SC nº 18.531/2022 now carries both.
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
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm
 * Lei 662/1949, the base national holidays law.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
 * Lei 10.607/2002, added Tiradentes and Finados.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
 * Lei 6.802/1980, declared Nossa Senhora Aparecida a national holiday.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm
 * Lei 14.759/2023, nationalized Dia da Consciência Negra from 2024.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9093.htm
 * Lei 9.093/1995, the framework law authorizing state and municipal holidays.
 * @see Official: https://www.in.gov.br/web/dou/-/portaria-mgi-n-11.460-de-29-de-dezembro-de-2025-678388627
 * Portaria MGI nº 11.460/2025, the federal executive's annual calendar of feriados nacionais and
 * pontos facultativos, the only source behind the Easter-derived entries; see the `getHolidays`
 * JSDoc for why Sexta-feira Santa is typed `national` without a law of its own.
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
