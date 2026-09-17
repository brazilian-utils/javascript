import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { resolveStateHolidayDate } from "../_internals/resolve-state-holiday-date/resolve-state-holiday-date";
import {
	CONSCIENCIA_NEGRA_HOLIDAY_NAME,
	CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
	FIXED_HOLIDAYS,
	STATE_HOLIDAYS,
} from "./constants";

export type { StateCode } from "../_internals/constants/states";

/** The class a holiday returned by `getHolidays` falls into. */
export type HolidayType = "national" | "state" | "optional" | "religious";

/** One holiday returned by `getHolidays`. */
export type Holiday = {
	/** The holiday name in Brazilian Portuguese, e.g. `"Sexta-feira Santa"`. */
	name: string;
	/** The holiday date, at local midnight of the requested year. */
	date: Date;
	/** How the holiday is observed: national, state, optional (ponto facultativo) or religious. */
	type: HolidayType;
};

/** The object form `getHolidays` accepts, naming the year to list and, optionally, the state whose holidays are added. */
export type GetHolidaysParams = {
	/** The four digit year to list holidays for. Must be an integer between 1900 and 2099. */
	year: number;
	/** Two letter state code whose state holidays are added to the national ones (default: national holidays only). */
	stateCode?: StateCode;
};

/**
 * The object form `getHolidays` accepts, the 2.3.0 name of `GetHolidaysParams`.
 *
 * @deprecated Use `GetHolidaysParams` instead.
 */
export type GetHolidaysOptions = GetHolidaysParams;

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

	const easterDate = resolveStateHolidayDate(year, { easterOffset: 0 });

	holidays.push(
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

	// An own entry lookup, so a prototype chain key ("toString", "__proto__", ...) is an unknown
	// state code like any other, and so is `undefined` when no state code was given.
	const stateEntry = Object.entries(STATE_HOLIDAYS).find(([code]) => code === stateCode);

	if (stateEntry) {
		for (const entry of stateEntry[1]) {
			const { name, type, since, until } = entry;
			// Stryker disable next-line ConditionalExpression: `since` is undefined for most entries, and `year < undefined` is already always false, so the explicit `since !== undefined` guard never changes the outcome
			if (since !== undefined && year < since) continue;
			// Stryker disable next-line ConditionalExpression: `until` is undefined for most entries, and `year >= undefined` is already always false, so the explicit `until !== undefined` guard never changes the outcome
			if (until !== undefined && year >= until) continue;

			const date = resolveStateHolidayDate(year, entry);
			const stateHoliday: Holiday = { name, date, type: type ?? "state" };
			// Name and date together are the identity of a holiday here: a state entry only replaces
			// a national one when both match, so DF's Corpus Christi replaces the national optional
			// one while its Fundação de Brasília is listed next to Tiradentes, which falls on the
			// same 21 April under a different name.
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
 * and is kept for backwards compatibility). The lookup is an own-property one, so a
 * prototype-chain key such as `"__proto__"`, `"constructor"` or `"toString"` is an unknown
 * state code like any other rather than a crash.
 *
 * When a state entry falls on the same date as a national one and carries the same name, the
 * state entry replaces it instead of being listed twice: this is how the Distrito Federal's
 * Corpus Christi, a feriado under Lei distrital nº 72/1989 art. 1º parágrafo único, comes back
 * typed `"state"` for `stateCode: "DF"` while staying `"optional"` everywhere else.
 *
 * Only one state holiday per UF is a feriado civil under Lei 9.093/1995 art. 1º, II, which
 * authorizes "a data magna do Estado fixada em lei estadual" in the singular; the other entries
 * of `STATE_HOLIDAYS` rest on ordinary state laws and are reported because they are observed in
 * practice. The date returned is the statutory one. Santa Catarina's two holidays are the only
 * observance shift the table models: each moves to the following Sunday when it falls Monday to
 * Friday, 11 August from 2005 on, when Lei SC nº 13.408/2005 extended the transfer to it, and
 * 25 November from 1999 on, when Lei SC nº 11.213/1999 first introduced it, except in 2004, the
 * year art. 3º of Lei SC nº 12.906/2004 left it without a transfer clause. Outside those ranges
 * each holiday stays on 11 August or 25 November. Acre's Tuesday-to-Thursday shift and the Goiás decrees
 * that may move 26/07 and 28/10 are not modelled, because neither can be resolved from a year
 * alone.
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
 * The national holiday laws are cited below; the state holiday laws are cited individually, one
 * `@see` per holiday, in `src/get-holidays/constants.ts`.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm
 * Lei 662/1949, the base national holidays law (Ano novo, Dia do trabalhador, Independência do
 * Brasil, Proclamação da República, Natal).
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
 * Lei 10.607/2002, rewrote that art. 1º into the list in force: it added Finados (2 November)
 * to the national holidays and folded in Tiradentes (21 April), already national since art. 3º
 * of Lei 1.266/1950, which its own art. 3º revoked.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/L1266.htm
 * Lei 1.266/1950, art. 3º, which first made Tiradentes a national holiday: "É feriado nacional o
 * dia 21 de abril, consagrado à glorificação de Tiradentes". Revoked by Lei 10.607/2002 only
 * after that law had carried 21 April into Lei 662/1949.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
 * Lei 6.802/1980, declared Nossa Senhora Aparecida (12 October) a national holiday.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm
 * Lei 14.759/2023, nationalized Dia da Consciência Negra (20 November) from
 * `CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR` (2024) onward.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9093.htm
 * Lei 9.093/1995, the framework law authorizing one state civil holiday (art. 1º, II, "a data
 * magna do Estado fixada em lei estadual") and up to four municipal religious holidays, "neste
 * incluída a Sexta-Feira da Paixão" (art. 2º); the legal basis for the data magna entries of
 * `STATE_HOLIDAYS`.
 * @see Official: https://www.in.gov.br/web/dou/-/portaria-mgi-n-11.460-de-29-de-dezembro-de-2025-678388627
 * Portaria MGI nº 11.460/2025, the federal executive's annual calendar of feriados nacionais and
 * pontos facultativos, reissued every December. It is the source of the typing of three of the
 * four entries derived from Easter, which no federal law declares: "Paixão de Cristo (feriado
 * nacional)" (Easter minus 2, emitted as `"Sexta-feira Santa"` typed `national`), "Carnaval (ponto
 * facultativo)" (Easter minus 47) and "Corpus Christi (ponto facultativo)" (Easter plus 60), both
 * typed `optional`. Sexta-feira Santa has no statutory basis of its own: Lei 9.093/1995 art. 2º
 * places it among the *municipal* religious holidays, and it is typed `national` here because the
 * portaria observes it nationwide. The fourth entry, Easter Sunday itself, is emitted as
 * `"Páscoa"` typed `religious` and has no normative basis at all: the portaria never mentions it,
 * no federal law declares it, and its date is derived arithmetically by `resolveStateHolidayDate`
 * with the Meeus/Jones/Butcher algorithm. It is a convenience entry, listed because callers
 * computing a liturgical calendar expect it, not because it is a holiday anyone observes as a day
 * off.
 */
export function getHolidays(year: number): Holiday[];
/**
 * Retrieves all Brazilian holidays for a given year, optionally including the holidays of a
 * state. See the overload taking a year for the full documentation.
 *
 * @param {GetHolidaysParams} options - The year to list holidays for and, optionally, the state whose holidays are added
 * @returns {Holiday[]} An array of holidays sorted by date
 */
export function getHolidays(options: GetHolidaysParams): Holiday[];
export function getHolidays(yearOrOptions: number | GetHolidaysParams): Holiday[] {
	let year: number;
	let stateCode: StateCode | undefined;

	if (typeof yearOrOptions === "number") {
		year = yearOrOptions;
		stateCode = undefined;
	} else {
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
