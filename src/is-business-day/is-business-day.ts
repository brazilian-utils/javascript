import { type StateCode } from "../_internals/constants/states";
import { isSupportedHolidayYear } from "../_internals/is-supported-holiday-year/is-supported-holiday-year";
import { getHolidays } from "../get-holidays/get-holidays";

export type { StateCode } from "../_internals/constants/states";

/**
 * Options shared by every business day util (`isBusinessDay`, `addBusinessDays`,
 * `subBusinessDays` and `differenceInBusinessDays`): which holidays count as non-business days.
 */
export type BusinessDayOptions = {
	/** Two letter state code whose state holidays are also treated as non-business days (default: national holidays only). */
	stateCode?: StateCode;
	/** Whether optional-type holidays (`Holiday.type === "optional"`, e.g. Carnaval, Corpus Christi) count as non-business days (default: `true`). */
	includeOptional?: boolean;
};

const WEEKEND_DAYS = new Set([0, 6]);

/**
 * Checks whether a given date is a Brazilian business day (dia útil).
 *
 * A day is not a business day when it falls on Saturday or Sunday, or when it is a
 * Brazilian holiday returned by `getHolidays({ year, stateCode })` for `value`'s **local
 * calendar day** (its local year/month/day, as read by `Date#getFullYear`/`getMonth`/`getDate`),
 * the same convention used by `isHoliday`. Build `value` from local components
 * (`new Date(2024, 11, 25)`) rather than from a date-only ISO string when you mean a
 * specific local day, for the same reason documented in `isHoliday`.
 *
 * `options.includeOptional` defaults to `true`: holidays whose `Holiday.type` is
 * `"optional"` (Carnaval and Corpus Christi) are treated as non-business days even though
 * they are not statutory holidays. Pass `false` to only treat statutory (`"national"` and
 * `"state"`) holidays as non-business days.
 *
 * An invalid `options.stateCode` is treated in two different ways, depending on its type, the
 * same split `isHoliday` makes:
 *
 * - a string that is not a known state code is ignored, and only national holidays are
 *   considered, the same behavior as `getHolidays`. The lookup is an own-property one, so a
 *   prototype-chain key such as `"__proto__"` or `"constructor"` is an unknown state code like
 *   any other;
 * - a `stateCode` that is present and is not a string at all (a number, `null`, an object) is
 *   rejected rather than ignored: `isBusinessDay` returns `false` without looking at the date,
 *   even when that date is an ordinary Tuesday. `undefined`, or an absent property, is the only
 *   non-string value that stands for "no state" instead. `addBusinessDays`, `subBusinessDays`
 *   and `differenceInBusinessDays` reject the same value with `null`.
 *
 * Two state rules change what `includeOptional: false` answers. The Distrito Federal declares
 * Corpus Christi a feriado (Lei distrital nº 72/1989, art. 1º parágrafo único), so with
 * `stateCode: "DF"` it is typed `"state"` and still counts; and Santa Catarina's two holidays
 * are observed on the following Sunday when they fall Monday to Friday (Lei SC nº 18.531/2022),
 * so 11 August 2025, a Monday, is a business day there.
 *
 * Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date
 * outside it returns `false` rather than silently treating every weekday as a business day.
 *
 * @param {Date} value - The date to check.
 * @param {BusinessDayOptions} [options] - Which holidays count as non-business days.
 * @param {StateCode} [options.stateCode] - Brazilian state code whose state holidays are also considered.
 * @param {boolean} [options.includeOptional] - Whether optional holidays count as non-business days (default: `true`).
 * @returns {boolean} True when `value` is a business day, false otherwise. Bad input also
 * returns false: a `value` that is not a valid `Date` (including non-`Date` values), a
 * `value` outside the supported 1900-2099 range, or a `stateCode` that is present and is not a
 * string.
 *
 * @example
 * ```typescript
 * isBusinessDay(new Date(2024, 0, 2)); // true (Tuesday, not a holiday)
 * isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
 * isBusinessDay(new Date(2024, 0, 6)); // false (Saturday)
 * isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval, optional holiday, counted by default)
 * isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
 * isBusinessDay(new Date(2024, 6, 9), { stateCode: "SP" }); // false (Revolução Constitucionalista)
 * isBusinessDay(new Date(2024, 6, 9)); // true (state holiday ignored without stateCode)
 * isBusinessDay(new Date("not a date")); // false
 * isBusinessDay(new Date(2100, 0, 4)); // false (a Monday, but 2100 is outside the supported range)
 * ```
 * isBusinessDay(new Date(2024, 6, 9), { stateCode: 5 }); // false (a non-string stateCode is rejected)
 *
 * The underlying holidays are the ones `getHolidays` computes; see its JSDoc (and
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
 * pontos facultativos: the source of Sexta-feira Santa being observed nationally and of Carnaval
 * and Corpus Christi being ponto facultativo, which is what `includeOptional` switches on.
 */
export const isBusinessDay = (value: Date, options?: BusinessDayOptions): boolean => {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;

	const year = value.getFullYear();

	if (!isSupportedHolidayYear(year)) return false;

	if (WEEKEND_DAYS.has(value.getDay())) return false;

	const stateCode = options?.stateCode;

	if (stateCode !== undefined && typeof stateCode !== "string") return false;

	const includeOptional = options?.includeOptional ?? true;

	const month = value.getMonth();
	const date = value.getDate();

	return !getHolidays({ year, stateCode }).some((holiday) => {
		if (!includeOptional && holiday.type === "optional") return false;

		return holiday.date.getMonth() === month && holiday.date.getDate() === date;
	});
};
