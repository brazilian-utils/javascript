import { type StateCode } from "../_internals/constants/states";
import { type HolidayDateRule } from "../_internals/resolve-state-holiday-date/resolve-state-holiday-date";
import { type HolidayType } from "./get-holidays";

/**
 * The years a holiday entry is in force: from `since` (inclusive) up to `until` (exclusive). An
 * absent bound leaves that side open.
 */
export type HolidayPeriod = {
	/** First year the entry is in force (inclusive). */
	since?: number;
	/** First year the entry is no longer in force (exclusive). */
	until?: number;
};

type StateHolidayEntry = HolidayDateRule &
	HolidayPeriod & {
		name: string;
		type?: HolidayType;
	};

type NationalHolidayEntry = HolidayPeriod & {
	name: string;
	day: number;
	month: number;
};

export const CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR = 2024;

/**
 * The name the first round of the elections is emitted under, the feriado nacional of art. 380
 * of the Código Eleitoral.
 */
export const ELECTION_HOLIDAY_NAME = "Eleições (primeiro turno)";

/**
 * The name the single-round general elections of 1955 and 1958 are emitted under, the "eleições
 * gerais" of Lei nº 1.266/1950, art. 1º; the Constitutions of the time had no second round.
 */
export const ELECTION_GENERAL_HOLIDAY_NAME = "Eleições gerais";

/**
 * First year the first round of every even year's elections falls on a date the Constitution
 * fixes: EC nº 16, de 04/06/1997, set it on the first Sunday of October (arts. 28, 29, II, and 77)
 * and the 1998 general elections were the first held under it. The general elections before it
 * that fell on a weekday are dated one by one in `FIXED_HOLIDAYS`.
 */
export const ELECTION_SINCE_YEAR = 1998;

/**
 * Years whose first round the Constitution moved off the first Sunday of October, as `[month,
 * day]` pairs (month 1 to 12): art. 1º of EC nº 107, de 02/07/2020, "As eleições municipais
 * previstas para outubro de 2020 realizar-se-ão no dia 15 de novembro, em primeiro turno".
 */
export const ELECTION_DATE_OVERRIDES: Readonly<Partial<Record<number, readonly [number, number]>>> =
	{
		2020: [11, 15],
	};

/**
 * The name the 20 November entries are emitted under, national and state alike.
 *
 * No law spells it exactly this way. Art. 1º of Lei 14.759/2023 calls the national holiday "Dia
 * Nacional de Zumbi e da Consciência Negra", and the state laws behind the pre-2024 entries of
 * Mato Grosso, Rio de Janeiro and Amazonas are worded alike to each other: each institutes 20
 * November as a feriado estadual and names the date after the federal commemorative one, "Dia
 * Nacional da Consciência Negra" (see the `@see` entries below for the three texts), while the
 * older Alagoas law names the date after Zumbi dos Palmares alone. The form
 * below drops a "Nacional" that would read as wrong on a state entry, is the one 2.3.0 already
 * emitted for the national holiday, and keeps the name continuous across the 2023/2024 boundary
 * where the state entries give way to the national one. Amapá is the exception: art. 1º of its
 * Lei nº 1.169/2007 says "Dia Estadual da Consciência Negra" in so many words, so that entry
 * carries the name its own law uses.
 */
export const CONSCIENCIA_NEGRA_HOLIDAY_NAME = "Dia da Consciência Negra";

/**
 * The fixed-date feriados nacionais, each emitted only for the years a federal norm declared it.
 * A holiday with a gap in its history is listed once per period. The supported years start in
 * 1900, under the republican calendar of Decreto nº 155-B/1890.
 *
 * - Ano novo, Independência do Brasil and Proclamação da República: every supported year
 *   (Decreto nº 155-B/1890, Decreto nº 19.488/1930, Lei nº 662/1949).
 * - The other "dias de festa nacional" of Decreto nº 155-B/1890, 3 May (descoberta do Brasil), 13
 *   May (fraternidade dos Brasileiros), 14 July (República, Liberdade e Independência dos povos
 *   americanos) and 12 October (descoberta da América), and 24 February (promulgação da
 *   Constituição), which Decreto nº 3/1891 added: up to 1930. The decree gives each day a dedication
 *   and no short name, so the names are taken from those dedications. Decreto nº 19.488, de
 *   15/12/1930 (DOU 18/12/1930), set out to "reduzir os dias feriados" those acts had declared and
 *   left all five out of its list, so it read "festa nacional" as feriado too.
 * - Lei nº 108, de 29/10/1935 (DOU 05/11/1935), brought 3 May back and added 16 July (promulgação
 *   da Constituição de 1934) and 12 October, and Decreto-lei nº 486, de 10/06/1938 (DOU 11/06/1938),
 *   left the three out again: 3 May from 1936 to 1938, 16 July and 12 October in 1936 and 1937.
 * - The general elections held on a weekday while Lei nº 1.266/1950, art. 1º, made their day a
 *   feriado nacional (up to Lei nº 10.607/2002, which revoked it): 03/10/1955, which Lei nº
 *   2.550/1955, art. 80, also declares one in so many words, 03/10/1958, 03/10/1990 and
 *   03/10/1994. The others fell on a Sunday or on 15 November. Two are left out: 03/10/1960, since
 *   no official text located states the date of that year's presidential election (Lei nº
 *   3.752/1960 only fixes the Guanabara one on it), and 03/10/1996, a municipal election held in
 *   every municipality at once, which the Distrito Federal has none of, so whether it counts as
 *   "eleições gerais em todo o País" is left open.
 * - Tiradentes: Decreto nº 155-B/1890 up to 1930, since Decreto nº 19.488, de 15/12/1930, left
 *   it out of its list; Decreto nº 22.647, de 17/04/1933, restored it from 1933; Lei nº 662/1949,
 *   in force from its publication on 13/04/1949, left it out again, and art. 3º of Lei nº 1.266,
 *   de 08/12/1950, restored it from 1951 on.
 * - Dia do trabalhador: from 1925, the first 1 May after Decreto nº 4.859, de 26/09/1924.
 * - Nossa Senhora Aparecida: from 1980, Lei nº 6.802, de 30/06/1980.
 * - Finados: up to 1948 and from 2003 on. Decreto nº 155-B/1890, Decreto nº 19.488/1930 and
 *   Decreto-lei nº 486/1938 declared it up to 1948; Lei nº 662/1949, which regulated the whole
 *   list of feriados nacionais and revoked "as disposições em contrário", left it out, and no
 *   federal norm declared it again until Lei nº 10.607, de 19/12/2002, added it to that list from
 *   2003 on. The Câmara report on the bill behind Lei nº 10.607/2002 (PL nº 3.721/2000) reads the
 *   law the same way: "Só inova ao sugerir o dia de finados". Up to 2.4.0 it was listed every
 *   year.
 * - Natal: from 1922, Decreto nº 4.497, de 19/01/1922.
 * - Dia da Consciência Negra: from `CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR`, Lei nº 14.759/2023.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/decreto/1851-1899/D155-B.htm
 * Decreto nº 155-B, de 14/01/1890, the first republican calendar: "São considerados dias de festa
 * nacional": 1 January, 21 April, "3 de maio, consagrado á commemoração da descoberta do Brazil",
 * "13 de maio, consagrado á commemoração da fraternidade dos Brazileiros", "14 de julho,
 * consagrado á commemoração da Republica, da Liberdade e da Independencia dos povos americanos",
 * 7 September, "12 de outubro, consagrado á commemoração da descoberta da America", 2 November and
 * 15 November. Formally revoked only by Decreto nº 11, de 18/01/1991, Anexo IV.
 * @see Official: https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-3-28-fevereiro-1891-503824-publicacaooriginal-1-pe.html
 * Decreto nº 3, de 28/02/1891: "declarar de festa nacional o dia 24 de fevereiro, commemorativo da
 * promulgação da Constituição da Republica".
 * @see Official: https://www.lexml.gov.br/urn/urn:lex:br:federal:decreto:1922-01-19;4497
 * Decreto nº 4.497, de 19/01/1922, which added 25 December to the feriados nacionais.
 * @see Official: https://www.lexml.gov.br/urn/urn:lex:br:federal:decreto:1924-09-26;4859
 * Decreto nº 4.859, de 26/09/1924, which declared 1 May a feriado nacional.
 * @see Official: https://www2.camara.leg.br/legin/fed/decret/1930-1939/decreto-19488-15-dezembro-1930-508040-publicacaooriginal-1-pe.html
 * Decreto nº 19.488, de 15/12/1930, art. 1º: "São considerados feriados nacionais os seguintes
 * dias: 1º de janeiro, consagrado à comemoração da fraternidade universal; 1º de maio, consagrado
 * à confraternidade universal das classes operárias; 7 de setembro, consagrado à comemoração da
 * Independência do Brasil; 2 de novembro, consagrado à comemoração dos mortos; 15 de novembro,
 * consagrado à comemoração do advento da República; 25 de dezembro, consagrado à comemoração da
 * unidade espiritual dos povos christãos". Its first considerando names Decreto nº 155-B/1890 and
 * the decrees that added to it; the third, "podem e devem ser reduzidos os dias feriados".
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/1930-1949/l0108.htm
 * Lei nº 108, de 29/10/1935 (DOU 05/11/1935), art. 1º: "São considerados feriados nacionaes os
 * seguintes dias:" 1 January, 21 April, 1 May, "3 de maio, commemoração da descoberta do Brasil",
 * "16 de julho, commemoração da data em que foi promulgada a Constituição Federal", 7 September,
 * "12 de outubro, commemoração da descoberta da America", 2 November, 15 November and 25 December.
 * @see Official: https://www2.camara.leg.br/legin/fed/decret/1930-1939/decreto-22647-17-abril-1933-558774-publicacaooriginal-80337-pe.html
 * Decreto nº 22.647, de 17/04/1933, which restored the feriado nacional of 21 April, dedicated to
 * the memory of the martyrs of liberty in the person of Tiradentes, four days before that year's
 * date.
 * @see Official: https://www2.camara.leg.br/legin/fed/declei/1930-1939/decreto-lei-486-10-junho-1938-349693-publicacaooriginal-1-pe.html
 * Decreto-lei nº 486, de 10/06/1938 (DOU 11/06/1938), art. 1º: "São feriados nacionais os
 * seguintes dias: 1 de janeiro […]; 21 de abril […]; 1 de maio […]; 7 de setembro […]; 2 de
 * novembro - dedicado à comemoração dos mortos; 15 de novembro […]; 25 de dezembro […]".
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l0662.htm
 * Lei nº 662, de 06/04/1949 (DOU 13/04/1949), art. 1º in its original wording: "São feriados
 * nacionais os dias 1º de janeiro, 1º de maio, 7 de setembro, 15 de novembro e 25 de dezembro";
 * art. 4º: "revogadas as disposições em contrário".
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/L1266.htm
 * Lei nº 1.266, de 08/12/1950 (DOU 12/12/1950), art. 1º: "Será feriado nacional o dia em que se
 * realizarem eleições gerais em todo o País"; art. 3º: "É feriado nacional o dia 21 de abril,
 * consagrado à glorificação de Tiradentes". Revoked by art. 3º of Lei nº 10.607/2002.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/1950-1969/l2550.htm
 * Lei nº 2.550, de 25/07/1955, art. 80: "Será feriado nacional o dia 3 de outubro de 1955."
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/1950-1969/l3338.htm
 * Lei nº 3.338/1957, art. 9º: "Para as eleições que se realizarem em 3 de outubro de 1958", a Friday.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l8214.htm
 * Lei nº 8.214/1991, art. 1º, which counts the parties "que tenham elegido, em 3 de outubro de 1990,
 * [...] representante para o Congresso Nacional", a Wednesday; that date follows from the original
 * wording of arts. 28 and 77 of the Constitution ("noventa dias antes do término do mandato").
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l8713.htm
 * Lei nº 8.713, de 30/09/1993, art. 1º: the general elections "serão realizadas simultaneamente, em
 * todo o País, no dia 3 de outubro de 1994", a Monday.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6802.htm
 * Lei nº 6.802, de 30/06/1980, art. 1º: "É declarado feriado nacional o dia 12 de outubro, para
 * culto público e oficial a Nossa Senhora Aparecida, Padroeira do Brasil".
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm
 * Lei nº 10.607, de 19/12/2002, which gave art. 1º of Lei nº 662/1949 its current list: "1º de
 * janeiro, 21 de abril, 1º de maio, 7 de setembro, 2 de novembro, 15 de novembro e 25 de
 * dezembro".
 * @see Official: https://www2.camara.leg.br/legin/fed/lei/2002/lei-10607-19-dezembro-2002-473572-norma-pl.html
 * Lei nº 10.607/2002 came from PL nº 3.721/2000; the report of the Comissão de Educação,
 * Cultura e Desporto on it (30/05/2001) says the bill "Só inova ao sugerir o dia de finados".
 */
export const FIXED_HOLIDAYS: readonly NationalHolidayEntry[] = [
	{ name: "Ano novo", day: 1, month: 1 },
	{ name: "Promulgação da Constituição da República", day: 24, month: 2, until: 1931 },
	{ name: "Tiradentes", day: 21, month: 4, until: 1931 },
	{ name: "Tiradentes", day: 21, month: 4, since: 1933, until: 1949 },
	{ name: "Tiradentes", day: 21, month: 4, since: 1951 },
	{ name: "Dia do trabalhador", day: 1, month: 5, since: 1925 },
	{ name: "Descobrimento do Brasil", day: 3, month: 5, until: 1931 },
	{ name: "Descobrimento do Brasil", day: 3, month: 5, since: 1936, until: 1939 },
	{ name: "Fraternidade dos Brasileiros", day: 13, month: 5, until: 1931 },
	{
		name: "República, Liberdade e Independência dos Povos Americanos",
		day: 14,
		month: 7,
		until: 1931,
	},
	{ name: "Promulgação da Constituição Federal", day: 16, month: 7, since: 1936, until: 1938 },
	{ name: "Independência do Brasil", day: 7, month: 9 },
	{ name: ELECTION_GENERAL_HOLIDAY_NAME, day: 3, month: 10, since: 1955, until: 1956 },
	{ name: ELECTION_GENERAL_HOLIDAY_NAME, day: 3, month: 10, since: 1958, until: 1959 },
	{ name: ELECTION_HOLIDAY_NAME, day: 3, month: 10, since: 1990, until: 1991 },
	{ name: ELECTION_HOLIDAY_NAME, day: 3, month: 10, since: 1994, until: 1995 },
	{ name: "Descobrimento da América", day: 12, month: 10, until: 1931 },
	{ name: "Descobrimento da América", day: 12, month: 10, since: 1936, until: 1938 },
	{ name: "Nossa Senhora Aparecida", day: 12, month: 10, since: 1980 },
	{ name: "Finados", day: 2, month: 11, until: 1949 },
	{ name: "Finados", day: 2, month: 11, since: 2003 },
	{ name: "Proclamação da República", day: 15, month: 11 },
	{
		name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
		day: 20,
		month: 11,
		since: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
	},
	{ name: "Natal", day: 25, month: 12, since: 1922 },
];

/**
 * First year Alagoas' 30 November is a feriado estadual: art. 2º of Lei AL nº 7.530/2013, vetoed on
 * sanction, was promulgated by the Assembleia Legislativa on 08/04/2014.
 */
const AL_DIA_DO_EVANGELICO_SINCE_YEAR = 2014;

/**
 * First year Paraíba's 26 July and the 5 August of Lei PB nº 3.489/1967 are no longer holidays
 * under that law: Lei PB nº 10.601/2015 revoked its art. 2º on 17/12/2015 and made 5 August the
 * Data Magna from 2016.
 */
const PB_LEI_3489_ARTICLE_2_UNTIL_YEAR = 2016;

/** First year Tocantins' 18 March is no longer a holiday: Lei TO nº 2.013/2009 repealed the feriado clause on 18/02/2009. */
const TO_AUTONOMIA_UNTIL_YEAR = 2009;

/**
 * First year Santa Catarina's 25 November is a holiday: Lei SC nº 10.306, of December 1996, made
 * it the data magna of the state after that year's date had passed.
 */
const SC_ALEXANDRIA_SINCE_YEAR = 1997;

/**
 * First year Santa Catarina's 11 August is a holiday: Lei SC nº 12.906, de 22/01/2004, added it to
 * the caput of art. 1º of Lei SC nº 10.306/1996, which until then named 25 November alone.
 */
const SC_DIA_DO_ESTADO_SINCE_YEAR = 2004;

/**
 * First year Santa Catarina's 25 November moves to the following Sunday: Lei SC nº 11.213, de
 * 11/11/1999, added the transfer clause to Lei SC nº 10.306/1996 and, by its art. 2º, entered
 * into force on the day it was published (DO 16.290, de 12/11/1999), thirteen days before that
 * year's 25 November. Art. 3º of Lei SC nº 12.906/2004 revoked Lei SC nº 11.213/1999, but the
 * clause it had already written into Lei SC nº 10.306/1996 stays in the ALESC compilation of that
 * law, under the note "Redação incluída pela Lei n. 11.213, de 1999", so 2004 transfers too.
 */
const SC_ALEXANDRIA_TRANSFER_SINCE_YEAR = 1999;

/**
 * First year Santa Catarina's 11 August and 25 November both move to the following Sunday: Lei SC
 * nº 13.408, de 15/07/2005, added the transfer clause covering the two dates and entered into
 * force on the day it was published (DO 17.680, de 15/07/2005), before that year's 11 August. In
 * 2004, its only year before the transfer, the 11 August holiday was observed on the date itself.
 */
const SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR = 2005;

/**
 * Feriados estaduais, um `@see` por entrada.
 *
 * Entries typed `"optional"` are the pontos facultativos a state norm cited here declares:
 * Amazonas' 8 December and Pernambuco's 6 March of 2008 and 2009. The federal pontos facultativos (Carnaval Monday
 * and Tuesday, Corpus Christi) are emitted by `getHolidays` itself, and together they are what
 * `includeOptional` switches on.
 *
 * Only one of these is a feriado civil under art. 1º, II of Lei 9.093/1995, which authorizes
 * "a data magna do Estado fixada em lei estadual", in the singular. The remaining entries rest
 * on ordinary state laws (and, for a few states, on the state constitution) that declare further
 * feriados estaduais; the library reports them because they are observed in practice, not
 * because art. 1º, II covers them.
 *
 * The statutory date is what is emitted, save for the two shifts modelled here: Alagoas' 30
 * November moves back to Monday from a Tuesday and on to Friday from a Thursday
 * (`tuesdayToMondayThursdayToFriday`, Lei AL nº 7.530/2013, art. 2º parágrafo único), and Santa
 * Catarina's shift to the following Sunday (`nextSundayUnlessSunday`, from
 * `SC_ALEXANDRIA_TRANSFER_SINCE_YEAR` on for 25 November and from
 * `SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR` on for 11 August), which moves a Saturday date too, as
 * Decreto SC nº 1.460/2018 did with 11/08/2018. Of the shifts left out, Acre's law moves feriados
 * falling from Tuesday to Thursday on to the Friday (Lei AC nº 2.126/2009, in the wording of Lei AC
 * nº 2.247/2009, the Aniversário do Acre on 15/06 excepted), but the state's own annual calendar
 * decrees apply it unevenly (see the `@see` below), so the two official sources conflict and the
 * statutory date is kept; and the
 * Goiás executive may move 26/07 and 28/10 to a nearby dia útil by decree (Lei GO nº 20.756/2020,
 * art. 269, § 1º), and has moved 26/07 by a decree of its own every year since 2022 (see the `@see`
 * below), a date no rule derives from the year, and 28/10 by decree most years too (to 25/10 in
 * 2019, 30/10 in 2020, 27/10 in 2025 and 30/10 in 2026); Rondônia moved 04/01/2022 to 03/01/2022
 * (Decreto RO nº 26.739/2021, art. 4º); São Paulo moved 09/07 to
 * 25/05 for 2020 alone (Lei SP nº 17.264/2020), a one-off this table does not carry, and so are
 * Piauí's 19/10 of 2020 and 2021, brought forward to 15/05/2020 and 18/03/2021 by Leis PI nº
 * 7.371/2020 and 7.490/2021, and Tocantins' 05/10/2026, which the executive moved to 09/10 for its
 * own offices under Lei TO nº 1.088/1999 (both cited below), and Sergipe's 08/07/2020, brought
 * forward to 22/05/2020 by Lei SE nº 8.679/2020.
 *
 * Every entry starts (`since`) in the first year the norm cited for it was in force on the date,
 * and one that lost its basis stops (`until`, exclusive) in the first year it no longer applied, so
 * a year before a state's law carries no entry for it. Where a date was probably a holiday under an
 * older norm that could not be located (the 02/07 of Bahia before its 1989 Constitution is the
 * clearest case), the entry starts at the norm cited here all the same.
 *
 * @see Official: https://legis.ac.gov.br/detalhar/2249
 * Lei AC nº 3.137, de 27/06/2016, which creates the Dia Estadual do Católico on 20 January as a
 * feriado estadual, listed from 2017, the first 20 January after the law.
 * @see Official: https://legis.ac.gov.br/detalhar/274
 * Lei AC nº 2.126, de 19/06/2009 (DOE-AC 24/06/2009), "dispõe sobre o adiamento de feriados". Its original art. 1º
 * moved to Friday the feriados estaduais "que caírem nos demais dias úteis, à exceção dos alusivos
 * ao aniversário do Estado do Acre (15 de junho) e da Revolução Acreana (6 de agosto)"; its
 * parágrafo único: "Quando da ocorrência de mais de um feriado na semana, serão comemorados em dias
 * subseqüentes, de forma tal que o repouso e o lazer deem-se de forma contínua".
 * @see Official: https://legis.ac.gov.br/detalhar/414
 * Lei AC nº 2.247, de 21/12/2009 (DOE 30/12/2009), which gave that art. 1º its current wording:
 * "Serão comemorados por adiamento, nas sextas-feiras, os feriados estaduais que caírem entre as
 * terças e quintas-feiras, à exceção do alusivo ao aniversário do Estado do Acre"; it rewrote the
 * caput only, so the parágrafo único above stands. Not modelled, because the annual decrees that
 * apply it do not agree with it or with each other: Decreto AC nº 7.613/2020 (calendar of 2021)
 * moved 20/01 (a Wednesday) to Friday 22/01 but brought 17/11 (a Wednesday) forward to Tuesday
 * 16/11; Decreto AC nº 11.393/2024 (2024) moved 23/01 (a Tuesday) to 26/01 and 05/09 (a Thursday)
 * to 06/09; Decreto AC nº 11.610/2024 (2025) moved 23/01 (a Thursday) to 24/01; Decreto AC nº
 * 11.809/2025 (2026) moved 20/01 (a Tuesday) to Thursday 22/01, Friday 23/01 being the Dia do
 * Evangélico, and left 17/11 (a Tuesday) on its date. The 06/08 the original
 * wording excepted, the Início da Revolução Acreana, is only a ponto facultativo in those decrees,
 * and no state law declaring it a feriado was located, so it has no entry.
 * @see Official: https://legis.ac.gov.br/detalhar/1087
 * Lei AC nº 1.538, de 29/01/2004, Dia do Evangélico (23/01), listed from 2005
 * @see Official: https://legis.ac.gov.br/detalhar/1828
 * Lei AC nº 1.411, de 14/09/2001, Dia Internacional da Mulher (08/03), listed from 2002
 * @see Official: https://legis.ac.gov.br/detalhar/618
 * Lei AC nº 14, de 02/09/1964, Aniversário do Acre (15/06), listed from 1965
 * @see Official: https://legis.ac.gov.br/detalhar/940
 * Lei AC nº 243, de 04/12/1968, art. 2º, Dia da Amazônia (05/09), listed from 1969: "É
 * considerado feriado estadual o dia 5 de setembro em homenagem ao DIA DA AMAZÔNIA". Lei AC nº
 * 1.526/2004, cited here before, only adds the date to the calendário oficial de eventos.
 * @see Official: https://legis.ac.gov.br/detalhar/688
 * Lei AC nº 57, de 14/12/1965, Assinatura do Tratado de Petrópolis (17/11), listed from 1966
 * @see Official: https://sapl.al.al.leg.br/norma/3363
 * Lei AL nº 5.508, de 07/07/1993, São João (24/06), listed from 1994
 * @see Official: https://sapl.al.al.leg.br/norma/3364
 * Lei AL nº 5.509, de 07/07/1993, São Pedro (29/06), listed from 1994
 * @see Based on: https://www.legisweb.com.br/legislacao/?id=116708
 * Lei AL nº 5.724, de 01/08/1995, art. 1º, which considers "Feriado Estadual o dia 20 de novembro -
 * Morte do Líder Negro Zumbi dos Palmares" (state holiday from 1995, the law predating that year's
 * date, until it became national in 2024). The law names the date after Zumbi alone; the entry
 * carries `CONSCIENCIA_NEGRA_HOLIDAY_NAME`, the name the other pre-2024 state entries and the
 * national one share. The ALE-AL SAPL record of the law could not be reached, so the text was read
 * in the LegisWeb reproduction cited here.
 * @see Official: https://sapl.al.al.leg.br/media/sapl/public/normajuridica/2024/3117/lei_no_9.358_de_26_de_agosto_de_2024.pdf
 * Lei AL nº 9.358, de 26/08/2024 (DOE suplementar de 28/08/2024), art. 1º: "Fica considerado
 * Feriado Estadual no Estado de Alagoas, para fins do que dispõe a Lei Federal nº 9.093, de 12 de
 * setembro de 1995, a data de 16 de setembro – Dia da Emancipação Política do Estado de Alagoas".
 * Before it no state law made the date a holiday, but the state's annual calendar decrees list it
 * as one, "16 de setembro, Emancipação Política de Alagoas (feriado estadual)", next to the dates
 * they mark "(ponto facultativo)": Decreto AL nº 9.215, de 10/12/2010 (DOE-AL 13/12/2010, the
 * calendar of 2011), cited next, is the earliest whose text was read, so the entry starts in 2011
 * (up to 2.4.0 the date had no entry, and 2020 to 2023 were typed `"optional"`). The same label
 * shows in the DOE-AL search for the calendars published in 2008, 2009, 2011, 2012, 2013 and 2016,
 * and a despacho of the Gabinete Civil (DOE-AL 07/11/1995, p. 9) calls the date "dia feriado em
 * todo o Estado" by an act of D. João VI of 16/09/1817; neither reaches back far enough, with a
 * text read, to start the entry earlier.
 * @see Official: https://diario.imprensaoficial.al.gov.br/apinova/api/editions/downloadPdf/23955
 * Decreto AL nº 9.215, de 10/12/2010 (DOE-AL 13/12/2010, p. 1), the calendar of 2011: "XII –16 de
 * setembro, Emancipação Política de Alagoas (feriado estadual)". The calendars of 2020 to 2023
 * carry the same item: Decretos AL nº 68.782/2019, 72.527/2020, 76.819, de 03/01/2022, and
 * 86.020/2022.
 * @see Official: https://diario.imprensaoficial.al.gov.br/apinova/api/editions/downloadPdf/24602
 * Lei AL nº 7.530, de 08/08/2013 (DOE-AL de 09/08/2013, p. 89), art. 1º: "Fica instituído o Dia
 * Estadual do Evangélico, a ser comemorado no dia 30 de novembro de cada ano". Its art. 2º, which
 * makes the date a feriado, was vetoed on sanction and is cited next.
 * @see Official: https://diario.imprensaoficial.al.gov.br/apinova/api/editions/downloadPdf/24776
 * The same art. 2º and its parágrafo único, promulgated by the Presidente da Assembleia Legislativa
 * on 08/04/2014 after the veto was overridden (DOE-AL de 28/04/2014, p. 43): "Art. 2º- Em alusão à
 * data comemorativa de que trata esta Lei, fica declarado feriado estadual no dia 30 de novembro.
 * Parágrafo único: acaso o dia 30 de novembro recaia em uma terça-feira ou quinta-feira, o
 * feriado ficará antecipado para a segunda-feira ou adiado para a sexta-feira, respectivamente."
 * Listed from 2014, the first 30 November after the promulgation, and moved as the parágrafo
 * único says (`tuesdayToMondayThursdayToFriday`). The annual Decreto AL nº 106.093/2025, for 2026,
 * cites the law among the four state laws it applies. Missing up to 2.4.0.
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=17488
 * Lei AP nº 667, de 16/04/2002, art. 1º par. único, Dia de São José (19/03), listed from 2003
 * @see Official: https://www.al.ap.leg.br/ver_texto_lei.php?iddocumento=77794
 * Lei AP nº 2.213, de 11/07/2017 (DOE nº 6479, de 11/07/2017), Dia de Cabralzinho (15/05), listed
 * from 2018, the first 15 May after the law: "Fica instituído como Feriado Estadual, o dia 15 de
 * maio "Dia de Cabralzinho"". Missing up to 2.4.0.
 * @see Official: https://www.al.ap.leg.br/ver_texto_lei.php?iddocumento=35896
 * Lei AP nº 1.696, de 09/07/2012 (DOE nº 5264, de 10/07/2012), Dia de São Tiago (25/07): "Fica
 * instituído como Feriado Estadual, o dia 25 de julho, "Dia de São Tiago"". The STF struck it down
 * (ADI 4820, cited next), so 25/07 has no entry in any year; up to 2.4.0 it was listed from 2012.
 * Lei AP nº 2.430, de 23/07/2019, later kept 25 July only as a "data comemorativa".
 * @see Official: https://portal.stf.jus.br/processos/detalhe.asp?incidente=4275522
 * STF ADI 4820, brought by the Governador do Amapá. Decisão de julgamento of 20/09/2018, Tribunal
 * Pleno: "O Tribunal, por unanimidade, julgou procedente o pedido formulado na ação direta para
 * declarar a inconstitucionalidade da Lei n 1.696/2012 do Estado do Amapá, nos termos do voto do
 * Relator"; trânsito em julgado 12/12/2018. The declaration is erga omnes and ex tunc, as for
 * Rondônia's 18/06 (ADI 3940). Two other Amapá dates are not holidays: 05/10, whose Lei AP nº 1.204/2008
 * says the commemoration "não inclui dispensa de trabalho", and 25/11, which Lei AP nº 393/1997
 * makes a feriado only "para as pessoas que sejam doadoras de sangue voluntárias e permanentes".
 * @see Official: https://silegis.al.ap.leg.br/proposicaopdf/2CEatualizadaeconsolidadaateEC071comSumario.pdf
 * Constituição Estadual do AP, de 20/12/1991, art. 355, Criação do Território Federal do Amapá
 * (13/09), listed from 1992: "O dia 13 de Setembro, data magna do Amapá, é feriado em todo o
 * território do Estado".
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=22214
 * Lei AP nº 1.169, de 27/12/2007 (DOE nº 4157, de 27/12/2007), art. 1º: "Fica declarado feriado no
 * Estado do Amapá o dia vinte de novembro, data em que se comemora o DIA ESTADUAL DA CONSCIÊNCIA
 * NEGRA". In force on its publication, after that year's 20 November, so it is listed from 2008
 * (up to 2.4.0 from 2007) until it became national in 2024.
 * @see Official: https://sapl.al.am.leg.br/norma/8919
 * Lei AM nº 25, de 21/12/1977, Elevação do Amazonas à categoria de Província (05/09), listed
 * from 1978. The ALEAM record has the ementa "DECLARA feriado estadual o dia 05 de setembro" and
 * no text; the state's decrees date the law "de 09 de dezembro de 1977" instead (DOE-AM of
 * 29/08/2024). Either date gives 1978 as the first year.
 * @see Official: https://sapl.al.am.leg.br/norma/2873
 * Lei AM nº 84/2010, Dia da Consciência Negra (state holiday until it became national in 2024).
 * Its ementa carries the same wording as the Mato Grosso and Rio de Janeiro laws: "INSTITUI no
 * Calendário Oficial do Estado do Amazonas o dia 20 de novembro, data de aniversário da morte de
 * Zumbi dos Palmares e Dia Nacional da Consciência Negra, como feriado estadual".
 * @see Official: https://sapl.cmm.am.gov.br/norma/3932
 * Lei Municipal de Manaus nº 496/1999, Nossa Senhora da Conceição (08/12): "INSTITUI feriado
 * religioso no Município de Manaus no dia 8 de dezembro". No state law makes 08/12 a holiday: it
 * is a municipal holiday of the capital. The state declares it a ponto facultativo in its own
 * offices by decree (DOE-AM of 02/12/2025: "DECLARAR ponto facultativo nas repartições públicas,
 * autarquias e fundações do Estado, no dia 08 de dezembro de 2025"), so it is listed as
 * `"optional"`. Only the 2025 decree of the state was located, so the entry starts in 1999, the
 * year of the earliest norm located, the municipal law; up to 2.4.0 it was listed for every year
 * from 1900.
 * @see Official: https://diario.imprensaoficial.am.gov.br/portal/edicoes/download/17974
 * DOE-AM of 02/12/2025, the decree quoted above.
 * @see Official: https://www.legislabahia.ba.gov.br/documentos/constituicao-do-estado-da-bahia-de-05-de-outubro-de-1989
 * Constituição Estadual da BA, de 05/10/1989, art. 6º § 3º, Independência da Bahia (02/07),
 * listed from 1990: "O Dois de Julho, data magna da Bahia ..., é feriado em todo o território do
 * Estado". The date is older as a holiday than that text: the Casa Civil's calendar of 2026
 * (LegislaBahia, feriados2026.pdf) cites "Lei Estadual 38, de 03.01.1936" for it, but that law's
 * text was not located, so the entry starts at the Constitution.
 * @see Official: https://belt.al.ce.gov.br/index.php/constituicao-do-ceara/emendas-a-constituicao-do-ceara/item/5643-emenda-constitucional-n-73-de-1-de-dezembro-de-2011-d-o-06-12-11
 * Constituição Estadual do CE, art. 18 par. único (EC nº 73, de 01/12/2011, DO 06/12/2011),
 * Abolição da Escravidão no Ceará (25/03), listed from 2012: the text fixes the data magna, and
 * the feriado follows from Lei 9.093/1995, art. 1º, II.
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html
 * Lei distrital nº 72, de 27/12/1989, listed from 1990: art. 1º, I, Fundação de Brasília (21/04),
 * and art. 1º par. único,
 * Corpus Christi: "São, igualmente feriados, a Sexta-feira da Paixão e Corpus Christi, datas
 * móveis". Its art. 1º, II also makes 12/10, "data consagrada a Nossa Senhora Aparecida,
 * Padroeira de Brasília", a feriado; that day and the Sexta-feira da Paixão have no DF entry of
 * their own, since the national entries of the same name already make them holidays (Decreto DF
 * nº 48.117/2025, the 2026 calendar, calls the Paixão a "feriado nacional" too).
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/48922/Lei_963_1995.html
 * Lei distrital nº 963, de 04/12/1995, Dia do Evangélico (30/11), listed from 1996
 * @see Official: https://www3.al.es.gov.br/Arquivo/Documents/legislacao/html/LEI110102019.html
 * Lei ES nº 11.010, de 03/07/2019 (DOE 04/07/2019), art. 1º par. único, Nossa Senhora da Penha
 * (padroeira do estado, "sempre na segunda-feira, oitavo dia posterior ao domingo de Páscoa"),
 * listed from 2020, the first of those Mondays after the law
 * @see Official: https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756
 * Lei GO nº 20.756/2020, art. 269, II, the feriados estaduais of Goiás in force: "a) 26 de julho,
 * consagrado à fundação da cidade de Goiás; b) 24 de outubro, comemorativo ao lançamento da pedra
 * fundamental de Goiânia; c) 28 de outubro, consagrado ao servidor público". It took over on
 * 28/07/2020 from Lei GO nº 10.460/1988 and that one from Lei GO nº 9.990/1986 (both cited below),
 * whose art. 254 and 346 carried the same three dates, so all three are listed from 1986. These are
 * days of the servants' statute, whose caput reads "não haverá expediente em
 * nenhuma repartição ou serviço do Estado ... nos seguintes feriados"; no Goiás law fixing a data
 * magna as the feriado civil of Lei 9.093/1995, art. 1º, II was located (a search of the Casa
 * Civil legislation base for "data magna" returns nothing). The entries are kept as the "feriados
 * estaduais" that statute names. Its § 1º: "Fica o Chefe do Poder Executivo autorizado a
 * transferir os feriados de que tratam as alíneas "a" e "c" do inciso II deste artigo para outro
 * dia útil próximo".
 * @see Official: https://legisla.casacivil.go.gov.br/api/v2/pesquisa/legislacoes/115759
 * Decreto GO nº 10.935, de 23/06/2026, art. 2º: "Fica transferido para o dia 20 de julho de 2026 o
 * feriado consagrado à fundação da Cidade de Goiás". The Casa Civil base holds one such decree per
 * year: nº 10.118 (2022, to 25/07), nº 10.288 (2023, to 24/07), nº 10.481 (2024, to 22/07), nº
 * 10.709 (2025, to 28/07) and nº 10.935 (2026, to 20/07). The entry keeps the statutory 26/07,
 * since the observed date is only known once each year's decree is out.
 * @see Official: https://legisla.casacivil.go.gov.br/api/v2/pesquisa/legislacoes/83678
 * Lei GO nº 10.460, de 22/02/1988 (DOE 29/02/1988), the servants' statute Lei GO nº 20.756/2020
 * replaced, art. 346, II, in its original wording (the compiled text marks no amendment to it): "a)
 * 26 (vinte e seis) de julho, consagrado à fundação da cidade de Goiás; b) 24 (vinte e quatro) de
 * outubro, comemorativo ao lançamento da pedra fundamental de Goiânia; c) 28 (vinte e oito) de
 * outubro, consagrado ao funcionário público; d) 2 (dois) de novembro, dedicado ao culto dos
 * mortos". Up to 2.4.0 26/07 was listed from 2021 only.
 * @see Official: https://legisla.casacivil.go.gov.br/api/v2/pesquisa/legislacoes/85539
 * Lei GO nº 9.990, de 31/01/1986 (DOE 27/02/1986), the statute before it, in force "no dia 1º de
 * março de 1986" (art. 275), art. 254, II, "estaduais": the same four dates, 26 July, 24 October,
 * 28 October and "2 (dois) de novembro, dedicado à comemoração dos mortos". So the three dates
 * start in 1986, and 2 November is a Goiás feriado estadual from 1986 to 2002, the years Finados was
 * not a feriado nacional; from 2003 the national entry covers it (Lei GO nº 20.756/2020 moved it to
 * its list of national ones, art. 269, I).
 * @see Official: https://arquivos.al.ma.leg.br:8443/ged/legislacao/LEI_2457
 * Lei MA nº 2.457, de 02/10/1964, Adesão do Maranhão à Independência (28/07), listed from 1965:
 * "É feriado estadual o dia 28 de julho, data magna do Estado"
 * @see Official: http://arquivos.al.ma.leg.br:8080/ged/legislacao/LEI_11539
 * Lei MA nº 11.539, de 21/09/2021, promulgated by the Assembleia Legislativa, art. 1º: "Fica
 * considerado Feriado Estadual Religioso, o Feriado de Corpus Christi" (Easter plus 60). A
 * cautelar of the TJMA suspended it on an ADI brought by Fecomércio-MA, Fiema and the Associação
 * Comercial do Maranhão, and the Órgão Especial judged that ADI improcedente on 06/03/2024,
 * revoking the cautelar (cited next). The date the cautelar was granted was not located, so
 * whether the 2022 and 2023 dates were in force cannot be established: the entry starts in 2024,
 * the first Corpus Christi after the judgment. It replaces the national optional entry typed
 * `"state"`, as the Distrito Federal one does. Missing up to 2.4.0.
 * @see Official: https://www.tjma.jus.br/midia/tj/noticia/512660/tjma-julga-constitucional-lei-que-tornou-corpus-christi-feriado-estadual
 * TJMA, "TJMA julga constitucional lei que tornou Corpus Christi feriado estadual" (06/03/2024):
 * the Órgão Especial "reconheceu como constitucional a Lei nº 11.539, de 21 de setembro de 2021
 * ... que incluiu o feriado de Corpus Christi entre os feriados estaduais", by unanimity.
 * @see Official: http://arquivos.al.ma.leg.br:8080/ged/legislacao/LEI_12800
 * Lei MA nº 12.800, de 19/03/2026, art. 1º: "Fica instituído o dia 8 de março, Dia Internacional
 * da Mulher, como feriado estadual a ser celebrado anualmente", in force on its publication, after
 * that year's date, so listed from 2027. The press reports an ADI against it filed with the TJMA
 * on 30/03/2026; no decision was located. Maranhão's 28 August, which Lei MA nº 10.100/2014 makes
 * a "feriado estadual aos bancários" only, is not a general holiday and has no entry.
 * @see Official: https://www.almg.gov.br/atividade-parlamentar/leis/legislacao-mineira/lei/texto/?tipo=CON&num=1989&ano=1989&comp=&cons=1
 * Constituição Estadual de MG, art. 256 (EC nº 89/2011): "São considerados: I - data magna do
 * Estado o dia 21 de abril, Dia de Tiradentes; II - Dia de Minas o dia 16 de julho; III - Dia dos
 * Gerais o dia 8 de dezembro". The data magna falls on the national Tiradentes and 16/07 and 08/12
 * are not declared feriados, so Minas Gerais has no entry.
 * @see Official: https://www.al.mt.gov.br/norma-juridica/urn:lex:br;mato.grosso:estadual:lei.ordinaria:2002-12-27;7879
 * Lei MT nº 7.879, de 27/12/2002, Dia da Consciência Negra (state holiday from 2003 until it
 * became national in 2024). Art. 1º, as published in the Diário Oficial do Estado de Mato Grosso of
 * 27/12/2002 (p. 6), the text the ALMT ficha técnica links: "Fica instituído o dia 20 de
 * novembro, data do aniversário da morte de Zumbi dos Palmares e Dia Nacional da Consciência
 * Negra, como feriado estadual"; its ementa repeats the same wording, and the ficha técnica
 * records "Não consta revogação expressa". The "Lei MT nº 1.587/2002" cited for this holiday
 * elsewhere is not in the ALMT norm base at all, under any norm type: 7.879/2002 is the law that
 * creates it.
 * @see Official: https://aacpdappls.net.ms.gov.br/appls/legislacao/secoge/govato.nsf/1b758e65922af3e904256b220050342a/a489a293563f506304256e450002e9f8
 * Lei MS nº 10, de 29/10/1979, Criação do Estado de Mato Grosso do Sul (11/10), listed from 1980
 * @see Official: https://bancodeleis.alepa.pa.gov.br/arquivos/lei5999_1996_93239.pdf
 * Lei PA nº 5.999, de 10/09/1996, Adesão do Pará à Independência (15/08), listed from 1997
 * @see Official: https://sapl.al.pb.leg.br/norma/11988
 * Lei PB nº 10.601, de 16/12/2015, Data Magna do Estado da Paraíba (05/08), listed from 2016:
 * "INSTITUI COMO FERIADO CIVIL O DIA 05 DE AGOSTO, DATA MAGNA DO ESTADO DA PARAÍBA". Its art. 2º
 * also revoked art. 2º of Lei PB nº 3.489, de 30/08/1967, the basis of the 26/07 Morte de João
 * Pessoa entry, which is therefore emitted from 1968 up to 2015. That art. 2º read "São
 * considerados feriados estaduais o 5 de agosto, em comemoração à fundação da Paraíba, em 1585, e
 * o 26 de julho, em homenagem a memória do ex-Presidente João Pessoa", so 5 August was already a
 * feriado estadual under it: from 1968 to 2015 it is emitted as "Fundação da Paraíba", the name
 * that law gives it (2.4.0 listed 05/08 in every year, as "Data Magna do Estado da Paraíba"). Lei PB nº 3.489/1967 entered
 * into force on its publication (DOE 03/09/1967), after that year's date. Lei PB nº 14.171, de
 * 11/12/2025, which declares 20 November a feriado estadual, has no entry: the date has been the
 * national holiday of Lei 14.759/2023 since 2024.
 * @see Official: https://sapl.al.pb.leg.br/media/sapl/public/normajuridica/1967/2945/2945_texto_integral.pdf
 * Lei PB nº 3.489, de 30/08/1967, the scanned text of the law, art. 2º as quoted above. Its entries
 * are kept although the TRT-13 held, in 2015, that the law "nunca teve força normativa" (proc.
 * 0161000-98.2013.5.13.0023; the court's news of August 2015 and July 2016 report it, the judgment
 * itself sits behind a CAPTCHA): the law's own text declares the two dates feriados estaduais.
 * @see Official: https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=134573
 * Lei PR nº 18.384, de 17/12/2014, Emancipação Política do Paraná (19/12), a data comemorativa its
 * own text says is "não se constituindo em feriado civil", nor a ponto facultativo it declares.
 * Its art. 3º revoked the Lei PR nº 4.658, de 18/12/1962 (DO 21/12/1962), whose art. 1º read "Fica
 * consagrada a data de 19 de Dezembro como feriado estadual", so 19/12 is listed from 1963, the
 * first one after that law, up to 2013, the last one before its revocation.
 * @see Official: https://www.legislacao.pr.gov.br/legislacao/exibirAto.do?action=localizarAto&codTipoAto=1&nroAto=4658&dataAto=18%2F12%2F1962&tipoVisualizacao=original
 * Lei PR nº 4.658, de 18/12/1962, art. 1º, as quoted above.
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?tiponorma=1&numero=16241&complemento=0&ano=2017&tipo=&url=
 * Lei PE nº 16.241, de 14/12/2017, art. 49, Revolução Pernambucana (06/03), listed from 2018: "Dia 6 de março: Data Magna do
 * Estado de Pernambuco e feriado civil no âmbito do Estado de Pernambuco". Revoked the Lei PE nº
 * 16.059, de 08/06/2017, which fixed 6 March as "Data Magna e feriado civil" and, by its art. 6º,
 * revoked Leis PE nº 13.386/2007 and 13.835/2009. Before it, Lei PE nº 13.386, de
 * 24/12/2007, art. 1º, "Fica instituído o dia 06 (seis) de março como data Magna do Estado de
 * Pernambuco", gave the date "a condição de ponto facultativo", so 06/03 is listed as `"optional"`
 * in 2008 and 2009.
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?tiponorma=1&numero=13386&complemento=0&ano=2007&tipo=&url=
 * Lei PE nº 13.386, de 24/12/2007, as quoted above.
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?ano=2009&complemento=0&numero=13835&tipo=&tiponorma=1&url=
 * Lei PE nº 13.835, de 02/07/2009, which rewrote art. 1º of Lei PE nº 13.386/2007: "Fica instituído
 * o 1º (primeiro) domingo do mês de março, como Data Magna do Estado de Pernambuco, de acordo com Lei
 * Federal nº 9.093, de 12 de setembro de 1995", the feriado civil of that law, and revoked its art.
 * 2º, the ponto facultativo. Listed from 2010, the first such Sunday after it, to 2017: Lei PE nº
 * 16.059/2017 came on 08/06/2017, after that year's Sunday (05/03/2017). Always a Sunday, so it never
 * changes a business day count. Missing up to 2.4.0.
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?ano=2017&complemento=0&numero=16059&tipo=&tiponorma=1&url=
 * Lei PE nº 16.059, de 08/06/2017, as quoted above.
 * @see Official: https://sapl.al.pi.leg.br/norma/5849
 * Lei PI nº 176, de 30/08/1937, Dia do Piauí (19/10), listed from 1937: "19 de Outubro será
 * feriado estadual, com a denominação de DIA DO PIAUHY"
 * @see Official: https://sapl.al.pi.leg.br/norma/pesquisar?ementa=feriado
 * The ALEPI search for "feriado", which lists Lei PI nº 176/1937 as "Norma sem alterações
 * posteriores" and the two one-year laws that moved its date: Lei PI nº 7.371, de 11/05/2020, to
 * 15/05/2020, and Lei PI nº 7.490, de 17/03/2021, "ANTECIPA PARA O DIA 18 DE MARÇO DO ANO EM CURSO,
 * O FERIADO ALUSIVO AO DIA DO PIAUÍ". Neither is carried: each applies to one year only.
 * @see Official: http://alerjln1.alerj.rj.gov.br/contlei.nsf/f25edae7e64db53b032564fe005262ef/063f7c027766eab48325744a007a4ab0?OpenDocument
 * Lei RJ nº 5.243, de 14/05/2008, art. 1º, which "Institui, no âmbito do Estado do Rio de Janeiro,
 * a terça-feira de carnaval como Feriado Estadual", in force on its publication. That year's
 * Carnaval (5 February 2008) had already passed, so the entry is listed from 2009, under the name
 * of the national Carnaval Tuesday it replaces. The STF ADI 4131 against it was não conhecida
 * (cited below), so the law stands. The Monday stays a ponto facultativo in the state.
 * @see Official: http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/c8aa0900025feef6032564ec0060dfff/1baf90ca125ff96f8325740a00776600
 * Lei RJ nº 5.198, de 05/03/2008, São Jorge (23/04), listed from 2008: the ALERJ text of the law. Its Ficha Técnica records
 * no ação de inconstitucionalidade; the STF case is cited separately below. Rio de Janeiro's Dia do
 * Comércio (third Monday of October), which the annex of Lei RJ nº 5.645/2010 labels "FERIADO",
 * has no entry: the law behind it, Lei RJ nº 160/1977, only says it "será comemorado".
 * @see Official: https://portal.stf.jus.br/processos/detalhe.asp?incidente=2624787
 * STF ADI 4092, which upheld that law. Decisão de julgamento of 28/08/2023, Tribunal Pleno,
 * sessão virtual: "O Tribunal, por maioria, declarou a constitucionalidade da Lei do Estado do Rio
 * de Janeiro n. 5.198, de 5 de março de 2008, e, por conseguinte, julgou improcedente a presente
 * ação direta … Plenário, Sessão Virtual de 18.8.2023 a 25.8.2023"; trânsito em julgado 28/10/2023.
 * @see Official: http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/69d90307244602bb032567e800668618/80a541c3a5a9d63183256c7d0057bf25
 * Lei RJ nº 4.007, de 11/11/2002, Dia da Consciência Negra (state holiday from 2002 until it
 * became national in 2024). Art. 1º: "Fica instituído o dia 20 de novembro, data do aniversário da
 * morte de Zumbi dos Palmares e dia Nacional da consciência Negra, como feriado Estadual", the
 * same wording Mato Grosso's law of the same year carries. Its Ficha Técnica records no ação de
 * inconstitucionalidade either.
 * @see Official: https://portal.stf.jus.br/processos/detalhe.asp?incidente=2636281
 * STF ADI 4131, cited here before as pending against Lei RJ nº 4.007/2002, in fact sought "a
 * declaração de inconstitucionalidade da Lei n. 5.243, do Estado do Rio de Janeiro, de 14 de maio
 * de 2008" and was não conhecida on 21/09/2018 (trânsito em julgado 25/10/2018).
 * @see Official: https://alerjln1.alerj.rj.gov.br/contlei.nsf/f25edae7e64db53b032564fe005262ef/46837e4d22b01f3503258d2c0048abda?OpenDocument
 * Lei RJ nº 11.002, de 22/10/2025 (DO nº 196, 23/10/2025), art. 1º: "Fica instituído, no âmbito
 * do Estado do Rio de Janeiro, o Dia de Corpus Christi como feriado estadual, a ser celebrado na
 * primeira quinta-feira após decorridos sessenta dias do domingo de Páscoa", Easter plus 60, in
 * force on its publication, so listed from 2026. It replaces the national optional entry typed
 * `"state"`, as the Distrito Federal and Maranhão ones do. Missing up to 2.4.0.
 * @see Official: https://portal.stf.jus.br/processos/detalhe.asp?incidente=7434201
 * STF ADI 7898, brought by the CNC against Lei RJ nº 11.002/2025: "julgou improcedente o pedido
 * formulado na presente ação direta de inconstitucionalidade ... Plenário, Sessão Virtual de
 * 12.6.2026 a 19.6.2026", by unanimity; trânsito em julgado 13/08/2026. Rio de Janeiro's other two
 * state holiday laws voided by the STF have no entry: Lei RJ nº 8.174/2018 (second Sunday of May,
 * ADI 6133) and Lei RJ nº 8.217/2018 (Ash Wednesday for bank workers only, ADI 6083).
 * @see Official: http://www.al.rn.leg.br/storage/legislacao//arq5064574f632ec.pdf
 * Lei RN nº 8.913, de 06/12/2006, Mártires de Cunhaú e Uruaçu (03/10), listed from 2007, the
 * single entry of Rio Grande do Norte: a "Resumo da Lei" search for "feriado" in the ALRN legislation base
 * (https://www.al.rn.leg.br/legislacao/pesquisa) returns this law and no other.
 * @see Official: https://www.al.rn.leg.br/noticia/19157/rn-faz-519-anos-e-data-foi-criada-por-lei-estadual-em-alusao-ao-marco-de-touros
 * Lei RN nº 7.831, de 30/05/2000, the "Dia do Rio Grande do Norte" (07/08), which is *not* a
 * holiday and therefore has no entry. The ALRN records it as "Lei Ord. nº 7.831, de 30/05/2000"
 * and describes it in the Assembleia's own reporting on the date: the deputy "propôs o projeto de
 * lei instituindo o dia 7 de agosto como data do aniversário do Rio Grande do Norte. A lei 7.831
 * foi aprovada no dia 30 de maio de 2000, sancionada no dia seguinte". It creates a data
 * comemorativa and nothing else; the ALRN's own ementa index does not return it for "feriado",
 * and the state's 07/08 is a working day. The 07/09 "Dia do Rio Grande do Norte" this table
 * carried before 2.4.0 had no law behind it at all and merely duplicated the national
 * Independência do Brasil, which still makes `isHoliday` true on 07/09 for every state. The
 * ALRN's own download link for the 7.831 text
 * (https://www.al.rn.leg.br/storage/legislacao//Lei%20n%C2%BA%207.831.pdf) 404s, as do the links
 * of every other law it holds from that year.
 * @see Official: https://ww2.al.rs.gov.br/dal/LinkClick.aspx?fileticket=WQdIfqNoXO4%3d&tabid=3683&mid=5359
 * Constituição Estadual do RS compilada (the "Veja em HTML" document of the Assembleia's
 * Constituição Estadual page, linked below), art. 6º § 1º, Revolução Farroupilha (20/09): "O dia
 * 20 de setembro é a data magna, sendo considerado feriado no Estado. (Redação dada pela Emenda
 * Constitucional n.º 11, de 03/10/95) … (Renumerado pela Emenda Constitucional n.º 83, de
 * 28/09/23)". Listed from 1995, the year Decreto RS nº 36.180, de 18/09/1995, declared that 20
 * September a holiday, two weeks before the amendment made it permanent.
 * @see Official: https://ww2.al.rs.gov.br/dal/Legisla%C3%A7%C3%A3o/Constitui%C3%A7%C3%A3oEstadual/tabid/3683/Default.aspx
 * The Assembleia Legislativa do RS page that publishes that compiled text; it is a link hub and
 * carries no article text of its own.
 * @see Official: https://www.al.rs.gov.br/legis/M010/M0100099.ASP?Hid_IDNorma=11624
 * Decreto RS nº 36.180, de 18/09/1995, which sets the holiday of the state's data magna on 20
 * September: "O feriado correspondente à data magna do Estado será comemorado no dia 20 de
 * setembro".
 * @see Official: https://sapl.al.ro.leg.br/norma/4958
 * Lei RO nº 2.291, de 22/04/2010, Criação do Estado de Rondônia (04/01), listed from 2011: "DECLARA
 * O DIA 4 DE JANEIRO DATA MAGNA E FERIADO CIVIL ESTADUAL". Lei RO nº 3.170/2013, cited here before, is a
 * supplementary credit law: "AUTORIZA O PODER EXECUTIVO A ABRIR CRÉDITO SUPLEMENTAR POR ANULAÇÃO
 * ... EM FAVOR DAS UNIDADES ORÇAMENTÁRIAS: DEPARTAMENTO DE ESTRADAS E RODAGEM - DER/RO,
 * SECRETARIA DE ESTADO DE ASSISTÊNCIA SOCIAL - SEAS", nothing to do with holidays. Lei RO nº
 * 2.291/2010, art. 2º, "Fica revogado o Decreto-Lei nº 39, de 31 de dezembro de 1982", the norm
 * that first made the date a holiday (cited next), so the entry runs on from 1983.
 * @see Official: https://ditel.casacivil.ro.gov.br/COTEL/Livros/Files/DL39.pdf
 * Decreto-Lei RO nº 39, de 31/12/1982, "INSTITUI O DIA 04 DE JANEIRO FERIADO ESTADUAL", art. 1º:
 * "Fica instituído o dia 04 de janeiro de cada ano para comemorar a criação do Estado de Rondônia,
 * passando esta data a ser considerada feriado estadual". Listed from 1983 (up to 2.4.0 from
 * 2011). Decreto RO nº 26.739/2021, art. 4º, moved the 2022 date to Monday 03/01 for that year
 * alone, which the table does not carry.
 * @see Official: https://sapl.al.ro.leg.br/norma/3003
 * Lei RO nº 1.026, de 20/12/2001, the other law cited for Rondônia, whose art. 1º did create a
 * second feriado estadual — "Fica instituído feriado no Estado de Rondônia, o dia 18 de junho,
 * em homenagem aos evangélicos" — but which the STF struck down, so 18/06 has no entry.
 * @see Official: https://portal.stf.jus.br/processos/detalhe.asp?incidente=2545186
 * STF ADI 3940, which voided that law. Decisão de julgamento of 20/03/2020, Tribunal Pleno,
 * sessão virtual: "O Tribunal, por unanimidade, julgou procedente o pedido formulado na ação
 * direta para declarar a inconstitucionalidade da Lei nº 1.026, de 20 de dezembro de 2001, do
 * Estado de Rondônia, nos termos do voto do Relator ... Plenário, Sessão Virtual de 13.3.2020 a
 * 19.3.2020"; trânsito em julgado 11/08/2020. The declaration is erga omnes and ex tunc, so the
 * date is absent for every year, not only from 2020 on.
 * @see Official: http://sapl.al.rr.leg.br/media/sapl/public/normajuridica/1991/3912/constituicao_estadual_do_estado_de_roraima.pdf
 * Constituição Estadual de RR, de 31/12/1991, art. 9º, Criação do Estado de Roraima (05/10),
 * listed from 1992: "Cinco de outubro,
 * data magna de Roraima, é feriado em todo o território do Estado".
 * @see Official: http://leis.alesc.sc.gov.br/html/2022/18531_2022_lei.html
 * Lei SC nº 18.531/2022, the in-force consolidation, whose Anexo Único carries both Santa Catarina
 * holidays and the Sunday transfer: "Sempre que o dia 11 de agosto coincidir com dia útil da
 * semana, o feriado e os eventos alusivos à data serão transferidos para o domingo subsequente"
 * and the same clause for 25 de novembro. The law does not say whether a Saturday is a "dia útil
 * da semana"; the one official act that settles a Saturday, Decreto SC nº 1.460/2018 (cited next),
 * moved it, so a Saturday date moves to the Sunday too (up to 2.4.0 it stayed on the Saturday).
 * No act settles a Saturday 25 November (the calendar decrees, Decreto SC nº 16/2023 included, do
 * not list that date), so it follows the same clause the same way.
 * @see Official: https://leis.alesc.sc.gov.br/ato-normativo/executivo/48922
 * Decreto SC nº 1.460, de 29/01/2018, the calendar of 2018, art. 1º: "VIII – 11 de agosto, sábado,
 * Data Magna do Estado de Santa Catarina (feriado estadual)"; parágrafo único: "O feriado e os
 * eventos alusivos à data de que trata o inciso VIII do caput deste artigo serão transferidos para o
 * domingo subsequente".
 * @see Official: http://leis.alesc.sc.gov.br/html/1996/10306_1996_Lei.html
 * Lei SC nº 10.306, de 26/12/1996 (DO 15.582 de 26/12/1996), which made 25 November the data magna
 * after that year's date, so it is listed from 1997, and whose art. 1º reads, in the wording of Lei SC nº
 * 12.906/2004 that added 11 August from 2004 on: "É considerada data
 * magna do Estado o dia 11 de agosto, Dia do Estado de Santa Catarina, e dia de Santa Catarina de
 * Alexandria, dia 25 de novembro".
 * @see Official: http://leis.alesc.sc.gov.br/html/1999/11213_1999_Lei.html
 * Lei SC nº 11.213, de 11 de novembro de 1999, which added to art. 1º of Lei SC nº 10.306/1996 the
 * parágrafo único transferring 25 November alone: "Sempre que o dia 25 de novembro coincidir com
 * dia útil da semana, o feriado e os eventos alusivos à data serão transferidos para o domingo
 * subseqüente". Its art. 2º put it in force on the day it was published (DO 16.290, de 12/11/1999),
 * thirteen days before that year's 25 November, so the 25 November transfer starts in 1999 and not
 * in 2005. The Anexo of the in-force Lei SC nº 18.531/2022 credits the same clause to "10.306, de
 * 1996; 11.213, de 1999 e 12.906, de 2004".
 * @see Official: http://leis.alesc.sc.gov.br/html/2004/12906_2004_lei.html
 * Lei SC nº 12.906, de 22 de janeiro de 2004, which added 11 August to the caput of art. 1º of Lei
 * SC nº 10.306/1996 and, by its art. 3º, "Revoga-se a Lei nº 11.213, de 11 de novembro de 1999"
 * without restating the transfer clause. The clause Lei SC nº 11.213/1999 had written into Lei SC
 * nº 10.306/1996 stays in the ALESC compilation of that law all the same, so 25 November keeps
 * moving in 2004 (up to 2.4.0 it stayed on that year's Thursday); 11 August, which the clause did not
 * cover, stays on its date in 2004.
 * @see Official: http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html
 * Lei SC nº 13.408, de 15/07/2005, which reinstated the parágrafo único, this time transferring
 * both dates to the following Sunday, and, by its art. 2º, entered into force on the day it was
 * published (DO 17.680, de 15/07/2005): "Sempre que o dia 11 de agosto e o dia 25 de novembro
 * coincidirem com dias úteis da semana, os feriados e os eventos alusivos às datas serão
 * transferidos para o domingo subseqüente". Both of that year's dates fall after it. The two
 * holidays are therefore split by year: 11 August is fixed in 2004, its first year, and
 * transferring from 2005 on, while 25 November is fixed from 1997 to 1998 and transferring from 1999
 * on. Lei SC nº 16.719/2015, cited here before, was revoked by Lei SC nº
 * 17.335/2017, itself consolidated and revoked by Lei SC nº 18.531/2022.
 * @see Official: https://www.al.sp.gov.br/repositorio/legislacao/lei/1997/lei-9497-05.03.1997.html
 * Lei SP nº 9.497, de 05/03/1997, Revolução Constitucionalista (09/07), listed from 1997, art. 1º: "Fica
 * instituído, como feriado civil, o dia 9 (nove) de julho, data magna do Estado de São Paulo,
 * conforme autorizado pelo Artigo 1.º, inciso II, da Lei Federal n. 9.093, de 12 de setembro de
 * 1995". The "710/1995" cited for this holiday elsewhere is the number of the projeto de lei that
 * became it, not of a law. The same ALESP text records one exception this table does not model,
 * because it applies to a single year: Lei SP nº 17.264, de 22/05/2020, "que determinou a
 * comemoração do feriado, excepcionalmente para o ano de 2020, em 25 de maio".
 * @see Official: https://www.al.sp.gov.br/repositorio/legislacao/lei/2023/lei-17746-12.09.2023.html
 * Lei SP nº 17.746, de 12/09/2023, Dia da Consciência Negra: a permanent state holiday, listed
 * here only for 2023 because the national holiday of Lei 14.759/2023 takes over from 2024. Art.
 * 1º: "Fica instituído, no âmbito do Estado, o dia 20 de novembro de cada ano, Dia Estadual da
 * Consciência Negra, como feriado estadual". That is the Amapá wording, not the Mato Grosso one,
 * so this single-year entry is the one place the table reports a holiday under
 * `CONSCIENCIA_NEGRA_HOLIDAY_NAME` where the law itself says "Dia Estadual".
 * @see Official: https://aleselegis.al.se.leg.br/Arquivo/Documents/legislacao/html/CE11989.html
 * Constituição Estadual de SE, de 05/10/1989, art. 269. Its original wording made two feriados
 * estaduais: "Serão feriados estaduais o dia 08 de julho e 24 de outubro, datas consagradas à
 * Independência de Sergipe e à comemoração popular e tradicional da mesma independência". EC nº
 * 20, de 31/05/2000, rewrote it to "Será feriado estadual o dia 08 de julho, data consagrada à
 * Independência de Sergipe". So Independência de Sergipe (08/07) is listed from 1990, the first 8
 * July after the Constitution (2.4.0 listed it in every year), and the
 * Comemoração Popular da Independência de Sergipe (24/10) from 1989, nineteen days after the
 * Constitution, up to 1999.
 * @see Official: https://www.al.to.leg.br/arquivo/15717
 * Lei TO nº 960, de 17/03/1998, whose art. 1º caput only institutes the Dia da Autonomia (18/03);
 * the feriado estadual sat in the parágrafo único, so it is listed from 1998.
 * @see Official: https://www.al.to.leg.br/arquivo/15724
 * Lei TO nº 2.013, de 18/02/2009, which replaced that parágrafo único with a purely commemorative
 * provision, so 18/03 is emitted only up to 2008.
 * @see Official: https://www.al.to.leg.br/arquivo/6883
 * Lei TO nº 627, de 28/12/1993, Padroeira do Estado (Nossa Senhora da Natividade, 08/09), listed
 * from 1994
 * @see Official: https://www.al.to.leg.br/arquivo/6358
 * Lei TO nº 98, de 17/11/1989, Criação do Estado do Tocantins (05/10), listed from 1990
 * @see Official: https://www.al.to.leg.br/arquivos/7336.pdf
 * Lei TO nº 1.088, de 23/09/1999, art. 1º: "Fica o Chefe do Poder Executivo autorizado a antecipar
 * ou prorrogar feriados e dias santificados, sempre que convier aos interesses do serviço
 * público". Under it the executive moved 05/10/2026 to 09/10/2026 (Decreto TO nº 7.238/2026, per
 * the press; its official text could not be loaded from the DOE-TO site). Such a decree is a
 * one-year move for the state's own offices, so the statutory 05/10 is kept.
 */
export const STATE_HOLIDAYS: Partial<Record<StateCode, StateHolidayEntry[]>> = {
	AC: [
		{ name: "Dia do Católico", day: 20, month: 1, since: 2017 },
		{ name: "Dia do Evangélico", day: 23, month: 1, since: 2005 },
		{ name: "Dia Internacional da Mulher", day: 8, month: 3, since: 2002 },
		{ name: "Aniversário do Acre", day: 15, month: 6, since: 1965 },
		{ name: "Dia da Amazônia", day: 5, month: 9, since: 1969 },
		{ name: "Assinatura do Tratado de Petrópolis", day: 17, month: 11, since: 1966 },
	],
	AL: [
		{ name: "São João", day: 24, month: 6, since: 1994 },
		{ name: "São Pedro", day: 29, month: 6, since: 1994 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 1995,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
		{ name: "Emancipação Política de Alagoas", day: 16, month: 9, since: 2011 },
		{
			name: "Dia Estadual do Evangélico",
			day: 30,
			month: 11,
			tuesdayToMondayThursdayToFriday: true,
			since: AL_DIA_DO_EVANGELICO_SINCE_YEAR,
		},
	],
	AP: [
		{ name: "Dia de São José", day: 19, month: 3, since: 2003 },
		{ name: "Dia de Cabralzinho", day: 15, month: 5, since: 2018 },
		{ name: "Criação do Território Federal do Amapá", day: 13, month: 9, since: 1992 },
		{
			name: "Dia Estadual da Consciência Negra",
			day: 20,
			month: 11,
			since: 2008,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	AM: [
		{ name: "Elevação do Amazonas à categoria de Província", day: 5, month: 9, since: 1978 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2010,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
		{ name: "Nossa Senhora da Conceição", day: 8, month: 12, type: "optional", since: 1999 },
	],
	BA: [{ name: "Independência da Bahia", day: 2, month: 7, since: 1990 }],
	CE: [{ name: "Abolição da Escravidão no Ceará", day: 25, month: 3, since: 2012 }],
	DF: [
		{ name: "Fundação de Brasília", day: 21, month: 4, since: 1990 },
		{ name: "Corpus Christi", easterOffset: 60, since: 1990 },
		{ name: "Dia do Evangélico", day: 30, month: 11, since: 1996 },
	],
	ES: [{ name: "Nossa Senhora da Penha", easterOffset: 8, since: 2020 }],
	GO: [
		{ name: "Fundação da Cidade de Goiás", day: 26, month: 7, since: 1986 },
		{ name: "Lançamento da Pedra Fundamental de Goiânia", day: 24, month: 10, since: 1986 },
		{ name: "Dia do Servidor Público", day: 28, month: 10, since: 1986 },
		{ name: "Finados", day: 2, month: 11, since: 1986, until: 2003 },
	],
	MA: [
		{ name: "Adesão do Maranhão à Independência", day: 28, month: 7, since: 1965 },
		{ name: "Corpus Christi", easterOffset: 60, since: 2024 },
		{ name: "Dia Internacional da Mulher", day: 8, month: 3, since: 2027 },
	],
	MT: [
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2003,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	MS: [{ name: "Criação do Estado de Mato Grosso do Sul", day: 11, month: 10, since: 1980 }],
	PA: [{ name: "Adesão do Pará à Independência", day: 15, month: 8, since: 1997 }],
	PB: [
		{
			name: "Data Magna do Estado da Paraíba",
			day: 5,
			month: 8,
			since: PB_LEI_3489_ARTICLE_2_UNTIL_YEAR,
		},
		{
			name: "Fundação da Paraíba",
			day: 5,
			month: 8,
			since: 1968,
			until: PB_LEI_3489_ARTICLE_2_UNTIL_YEAR,
		},
		{
			name: "Morte de João Pessoa",
			day: 26,
			month: 7,
			since: 1968,
			until: PB_LEI_3489_ARTICLE_2_UNTIL_YEAR,
		},
	],

	PE: [
		{
			name: "Revolução Pernambucana",
			day: 6,
			month: 3,
			type: "optional",
			since: 2008,
			until: 2010,
		},
		{ name: "Revolução Pernambucana", firstSundayOfMonth: 3, since: 2010, until: 2018 },
		{ name: "Revolução Pernambucana", day: 6, month: 3, since: 2018 },
	],
	PI: [{ name: "Dia do Piauí", day: 19, month: 10, since: 1937 }],
	PR: [{ name: "Emancipação Política do Paraná", day: 19, month: 12, since: 1963, until: 2014 }],
	RJ: [
		{ name: "Carnaval (terça-feira)", easterOffset: -47, since: 2009 },
		{ name: "São Jorge", day: 23, month: 4, since: 2008 },
		{ name: "Corpus Christi", easterOffset: 60, since: 2026 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2002,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	RN: [{ name: "Mártires de Cunhaú e Uruaçu", day: 3, month: 10, since: 2007 }],
	RS: [{ name: "Revolução Farroupilha", day: 20, month: 9, since: 1995 }],
	RO: [{ name: "Criação do Estado de Rondônia", day: 4, month: 1, since: 1983 }],
	RR: [{ name: "Criação do Estado de Roraima", day: 5, month: 10, since: 1992 }],
	SC: [
		{
			name: "Dia do Estado de Santa Catarina",
			day: 11,
			month: 8,
			since: SC_DIA_DO_ESTADO_SINCE_YEAR,
			until: SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR,
		},
		{
			name: "Dia do Estado de Santa Catarina",
			day: 11,
			month: 8,
			nextSundayUnlessSunday: true,
			since: SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR,
		},
		{
			name: "Dia de Santa Catarina de Alexandria",
			day: 25,
			month: 11,
			since: SC_ALEXANDRIA_SINCE_YEAR,
			until: SC_ALEXANDRIA_TRANSFER_SINCE_YEAR,
		},
		{
			name: "Dia de Santa Catarina de Alexandria",
			day: 25,
			month: 11,
			nextSundayUnlessSunday: true,
			since: SC_ALEXANDRIA_TRANSFER_SINCE_YEAR,
		},
	],
	SP: [
		{ name: "Revolução Constitucionalista", day: 9, month: 7, since: 1997 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2023,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	SE: [
		{ name: "Independência de Sergipe", day: 8, month: 7, since: 1990 },
		{
			name: "Comemoração Popular da Independência de Sergipe",
			day: 24,
			month: 10,
			since: 1989,
			until: 2000,
		},
	],
	TO: [
		{
			name: "Autonomia do Estado do Tocantins",
			day: 18,
			month: 3,
			since: 1998,
			until: TO_AUTONOMIA_UNTIL_YEAR,
		},
		{
			name: "Padroeira do Estado (Nossa Senhora da Natividade)",
			day: 8,
			month: 9,
			since: 1994,
		},
		{ name: "Criação do Estado do Tocantins", day: 5, month: 10, since: 1990 },
	],
};
