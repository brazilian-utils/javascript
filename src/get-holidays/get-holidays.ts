import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { readHolidayStateCode } from "../_internals/read-holiday-state-code/read-holiday-state-code";
import {
	type MemoizedHoliday,
	readMemoizedHolidays,
} from "../_internals/read-memoized-holidays/read-memoized-holidays";

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

const buildHolidays = (holidays: readonly MemoizedHoliday[]): Holiday[] =>
	holidays.map(({ name, type, year, month, day }) => ({
		name,
		date: new Date(year, month, day),
		type,
	}));

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
 * Each fixed-date national holiday is listed only for the years a federal norm declared it
 * (Sexta-feira Santa, which the federal calendar portarias list as a feriado nacional, is listed
 * every year), so the older years of the supported range differ from today's list: Nossa Senhora Aparecida is listed from
 * 1980 (Lei 6.802/1980), Natal from 1922 and Dia do trabalhador from 1925, Tiradentes up to 1930,
 * from 1933 to 1948 and from 1951, since Lei 662/1949 left it out of its list until Lei
 * 1.266/1950 restored it, and Finados up to 1948 and from 2003, since Lei 662/1949 left it out as
 * well and only Lei 10.607/2002 put it back (up to 2.4.0 Finados was listed every year). The
 * other festas nacionais of the first republican calendar (Decreto 155-B/1890 and Decreto
 * 3/1891: 24 February, 3 May, 13 May, 14 July and 12 October) are listed up to 1930, and 3 May,
 * 16 July and 12 October again for the years Lei 108/1935 declared them (up to 2.4.0 none was).
 * `FIXED_HOLIDAYS` in `src/get-holidays/constants.ts` cites the decree or law behind each period.
 *
 * The first round of the elections is a national holiday in the even years from 1998 on, typed
 * `"national"` and named `"Eleições (primeiro turno)"`: art. 380 of the Código Eleitoral makes a
 * feriado nacional of "o dia em que se realizarem eleições de data fixada pela Constituição
 * Federal", and since EC nº 16/1997 the Constitution fixes the first round on the first Sunday of
 * October (arts. 28, 29, II, and 77), which EC nº 107/2020 moved to 15 November for 2020 alone. It
 * always falls on a Sunday, so it changes what `getHolidays` and `isHoliday` answer and never what
 * the business day utils count. The second round, "no último domingo de outubro ... se houver", is
 * left out: whether it is held depends on the first round's results, and only in the states and
 * municipalities where one is needed, so its date is not a holiday a year alone can establish.
 * Before 1998 the day of the general elections was a feriado nacional under Lei 1.266/1950, art.
 * 1º, until Lei 10.607/2002 revoked it; those that fell on a weekday are listed on their own dates:
 * 03/10/1955 and 03/10/1958 as `"Eleições gerais"`, and 03/10/1990 and 03/10/1994 as
 * `"Eleições (primeiro turno)"` (up to 2.4.0 none was). 03/10/1960 is left out, since no official
 * text located dates that year's presidential election, and so is the municipal election of
 * 03/10/1996, which the Distrito Federal did not hold.
 *
 * `stateCode` is matched ignoring letter case and surrounding whitespace, like the other state
 * utils, so `"sp"` lists the São Paulo holidays. Only an omitted (or `undefined`) `stateCode`
 * asks for the national holidays alone: any other value that is not the code of a Brazilian
 * state (an unknown string such as `"XX"`, an empty string, a prototype-chain key such as
 * `"__proto__"`, a value that is not a string) returns an empty array, as a year outside the
 * supported range does. Up to 2.4.0 such a code was ignored and the national holidays were
 * returned, so a typo silently dropped the state's holidays.
 *
 * When a state entry falls on the same date as a national one and carries the same name, the
 * state entry replaces it instead of being listed twice: this is how the Distrito Federal's
 * Corpus Christi, a feriado under Lei distrital nº 72/1989 art. 1º parágrafo único, comes back
 * typed `"state"` for `stateCode: "DF"` (and, from 2024 on, for `stateCode: "MA"`, under Lei MA nº
 * 11.539/2021) while staying `"optional"` everywhere else, and how Rio de
 * Janeiro's Carnaval Tuesday, a feriado estadual under Lei RJ nº 5.243/2008 from 2009 on, comes
 * back typed `"state"` for `stateCode: "RJ"`.
 *
 * Only one state holiday per UF is a feriado civil under Lei 9.093/1995 art. 1º, II, which
 * authorizes "a data magna do Estado fixada em lei estadual" in the singular; the other entries
 * of `STATE_HOLIDAYS` rest on ordinary state laws (Alagoas' 16 September, before Lei AL nº
 * 9.358/2024, on the state's calendar decrees alone) and are reported because they are observed in
 * practice. The date returned is the statutory one, save for two observance shifts the state laws
 * spell out. Alagoas' 30 November moves back to the Monday when it falls on a Tuesday and on to
 * the Friday when it falls on a Thursday (Lei AL nº 7.530/2013, art. 2º parágrafo único, from
 * 2014 on). Santa Catarina's two holidays each move to the following Sunday when they fall Monday to
 * Saturday (Decreto SC nº 1.460/2018 moved a Saturday 11 August; up to 2.4.0 a Saturday date
 * stayed), 11 August from 2005 on, when Lei SC nº 13.408/2005 extended the transfer to it, and
 * 25 November from 1999 on, when Lei SC nº 11.213/1999 first introduced it (up to 2.4.0 not in
 * 2004). Outside those ranges each holiday stays on 11 August or 25 November. Pernambuco's data
 * magna fell on the first Sunday of March from 2010 to 2017 (Lei PE nº 13.835/2009), and on 6
 * March from 2018. Acre's shift of the feriados falling Tuesday to
 * Thursday to the Friday (Lei AC nº 2.126/2009) is not modelled, because the state's own annual
 * decrees apply it unevenly (in 2026 they move 20 January and leave 17 November, a Tuesday, where
 * it is), and neither are the Goiás decrees that may move 26/07 and 28/10, which cannot be
 * resolved from a year alone.
 *
 * Each state entry is listed only from the first year the state norm cited for it applied, and up
 * to the last one, so a year before a state's law has no entry for it: 11 August in Santa Catarina
 * starts in 2004 (Lei SC nº 12.906/2004) and 25 November in 1997 (Lei SC nº 10.306/1996), São
 * Paulo's 9 July in 1997 (Lei SP nº 9.497/1997), Rio de Janeiro's São Jorge in 2008 (Lei RJ nº
 * 5.198/2008). The first year of every entry is given next to its law in
 * `src/get-holidays/constants.ts`. A state law the STF declared unconstitutional has no entry in
 * any year: Rondônia's 18 June (ADI 3940) and Amapá's 25 July (ADI 4820; up to 2.4.0 listed from
 * 2012).
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
 * Brasil, Proclamação da República, Natal), whose original list left out the Tiradentes and
 * Finados of the decrees before it. The decrees behind the years before 1949 are cited on
 * `FIXED_HOLIDAYS`.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
 * Lei 10.607/2002, rewrote that art. 1º into the list in force: it added Finados (2 November)
 * to the list of national holidays, absent from it since 1949, and folded in
 * Tiradentes (21 April), already national
 * since art. 3º of Lei 1.266/1950, which its own art. 3º revoked.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/L1266.htm
 * Lei 1.266/1950, art. 3º, which first made Tiradentes a national holiday: "É feriado nacional o
 * dia 21 de abril, consagrado à glorificação de Tiradentes". Revoked by Lei 10.607/2002 only
 * after that law had carried 21 April into Lei 662/1949.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
 * Lei 6.802, de 30/06/1980, declared Nossa Senhora Aparecida (12 October) a national holiday,
 * listed from 1980 on.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm
 * Lei 14.759/2023, nationalized Dia da Consciência Negra (20 November) from
 * `CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR` (2024) onward.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm
 * Código Eleitoral (Lei 4.737/1965), art. 380: "Será feriado nacional o dia em que se realizarem
 * eleições de data fixada pela Constituição Federal; nos demais casos, serão as eleições marcadas
 * para um domingo ou dia já considerado feriado por lei anterior".
 * @see Official: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm
 * Constituição Federal, art. 77, in the wording of EC nº 16/1997: the presidential election
 * "realizar-se-á, simultaneamente, no primeiro domingo de outubro, em primeiro turno, e no último
 * domingo de outubro, em segundo turno, se houver"; arts. 28 and 29, II, fix the same first
 * Sunday of October for governors and mayors.
 * @see Official: https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc16.htm
 * EC nº 16, de 04/06/1997, which gave arts. 28, 29, II, and 77 that wording, first applied to the
 * 1998 elections.
 * @see Official: https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc107.htm
 * EC nº 107, de 02/07/2020, art. 1º: "As eleições municipais previstas para outubro de 2020
 * realizar-se-ão no dia 15 de novembro, em primeiro turno, e no dia 29 de novembro de 2020, em
 * segundo turno, onde houver".
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9093.htm
 * Lei 9.093/1995, the framework law authorizing one state civil holiday (art. 1º, II, "a data
 * magna do Estado fixada em lei estadual") and up to four municipal religious holidays, "neste
 * incluída a Sexta-Feira da Paixão" (art. 2º); the legal basis for the data magna entries of
 * `STATE_HOLIDAYS`.
 * @see Official: https://www.in.gov.br/web/dou/-/portaria-mgi-n-11.460-de-29-de-dezembro-de-2025-678388627
 * Portaria MGI nº 11.460/2025, the federal executive's annual calendar of feriados nacionais and
 * pontos facultativos, reissued every December. It is the source of the typing of the entries
 * derived from Easter, which no federal law declares: "Paixão de Cristo (feriado nacional)"
 * (Easter minus 2, emitted as `"Sexta-feira Santa"` typed `national`), the two Carnaval days,
 * "16 de fevereiro Carnaval (ponto facultativo); 17 de fevereiro Carnaval (ponto facultativo)"
 * (Easter minus 48 and minus 47, emitted as `"Carnaval (segunda-feira)"` and `"Carnaval
 * (terça-feira)"`), and "Corpus Christi (ponto facultativo)" (Easter plus 60), all three typed
 * `optional`. Every portaria lists both Carnaval days: Portaria MGI nº 8.617/2023, for 2024, reads
 * "12 de fevereiro Carnaval (ponto facultativo); 13 de fevereiro Carnaval (ponto facultativo); 14
 * de fevereiro Quarta-Feira de Cinzas (ponto facultativo até as 14 horas)". Sexta-feira Santa has
 * no statutory basis of its own: Lei 9.093/1995 art. 2º places it among the *municipal* religious
 * holidays, and it is typed `national` here because the portaria observes it nationwide. The
 * remaining entry, Easter Sunday itself, is emitted as `"Páscoa"` typed `religious` and has no
 * normative basis at all: the portaria never mentions it, no federal law declares it, and its date
 * is derived arithmetically by `resolveStateHolidayDate` with the Meeus/Jones/Butcher algorithm.
 * It is a convenience entry, listed because callers computing a liturgical calendar expect it, not
 * because it is a holiday anyone observes as a day off.
 *
 * The portaria's other pontos facultativos are left out, because each is partial or concerns the
 * servants alone: the Quarta-feira de Cinzas is one only "até as 14 horas", 28 October is the Dia
 * do Servidor Público of Lei 8.112/1990, art. 236, a date about the servants themselves that the
 * financial market does not skip, the 24 and 31 December entries cover only their afternoons, and
 * the bridge days a given year adds next to a Thursday or Tuesday holiday (20 April and 5 June in
 * 2026) are one-off decisions no rule can derive from the year.
 * @see Official: https://www.in.gov.br/en/web/dou/-/portaria-mgi-n-8.617-de-26-de-dezembro-de-2023-533937211
 * Portaria MGI nº 8.617, de 26/12/2023 (DOU of 28/12/2023, Seção 1, p. 148), the 2024 calendar,
 * art. 1º, II and III, quoted above for the two Carnaval days.
 * @see Official: https://www.in.gov.br/web/dou/-/portaria-mgi-n-9.783-de-27-de-dezembro-de-2024-604395869
 * Portaria MGI nº 9.783, de 27/12/2024 (DOU of 30/12/2024, Seção 1, p. 794), the 2025 calendar,
 * art. 1º: "II - 3 de março, Carnaval (ponto facultativo); III - 4 de março, Carnaval (ponto
 * facultativo)". The three portarias of 2024 to 2026 list both Carnaval days as ponto
 * facultativo and never as feriado nacional, and none of their later amendments touches them.
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4880
 * Resolução CMN nº 4.880, de 23/12/2020 (DOU of 24/12/2020, in force from 01/03/2021), art. 6º,
 * which FEBRABAN's bank holiday calendar follows: "Não são considerados dias úteis, para fins de
 * operações praticadas no mercado financeiro e de prestação de informações ao Banco Central do
 * Brasil, os sábados, domingos e feriados de âmbito nacional, bem como: I - a segunda-feira e a
 * terça-feira de Carnaval; e II - o dia dedicado a Corpus Christi", the same three days typed
 * `optional` here. The Quarta-feira de Cinzas is not in that list: art. 2º, § 1º, II only allows a
 * "horário especial de atendimento" on it, so it stays a dia útil for the financial market too.
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

	const normalizedStateCode = readHolidayStateCode(stateCode);

	if (normalizedStateCode === null) return [];

	return buildHolidays(readMemoizedHolidays(year, normalizedStateCode));
}
