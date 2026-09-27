import { type StateCode } from "../_internals/constants/states";
import { type HolidayDateRule } from "../_internals/resolve-state-holiday-date/resolve-state-holiday-date";
import { type HolidayType } from "./get-holidays";

/**
 * The years a holiday entry is in force: from `since` (inclusive) up to `until` (exclusive). An
 * absent bound leaves that side open.
 */
export type HolidayPeriod = {
	since?: number;
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
 * 1900, under the republican calendar of Decreto nº 155-B/1890; its 3 May, 13 May, 14 July and
 * 12 October ("descobrimento da América") entries, all dropped by Decreto nº 19.488/1930, are not
 * carried.
 *
 * - Ano novo, Independência do Brasil and Proclamação da República: every supported year
 *   (Decreto nº 155-B/1890, Decreto nº 19.488/1930, Lei nº 662/1949).
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
 * Decreto nº 155-B, de 14/01/1890, the first republican calendar: 1 January, 21 April, 3 May, 13
 * May, 14 July, 7 September, 12 October, 2 November and 15 November.
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
 * unidade espiritual dos povos christãos".
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
 * Lei nº 1.266, de 08/12/1950, art. 3º: "É feriado nacional o dia 21 de abril, consagrado à
 * glorificação de Tiradentes".
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
	{ name: "Tiradentes", day: 21, month: 4, until: 1931 },
	{ name: "Tiradentes", day: 21, month: 4, since: 1933, until: 1949 },
	{ name: "Tiradentes", day: 21, month: 4, since: 1951 },
	{ name: "Dia do trabalhador", day: 1, month: 5, since: 1925 },
	{ name: "Independência do Brasil", day: 7, month: 9 },
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

/** First year Alagoas' 16 September is a feriado estadual, not a ponto facultativo (Lei AL nº 9.358/2024). */
const AL_EMANCIPACAO_FERIADO_SINCE_YEAR = 2024;

/** First year Paraíba's 26 July is no longer a holiday: Lei PB nº 10.601/2015 revoked its basis on 17/12/2015. */
const PB_MORTE_JOAO_PESSOA_UNTIL_YEAR = 2016;

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
 * year's 25 November.
 */
const SC_ALEXANDRIA_TRANSFER_SINCE_YEAR = 1999;

/**
 * The one year Santa Catarina's 25 November is observed on the statutory date again: art. 3º of
 * Lei SC nº 12.906, de 22/01/2004, revoked Lei SC nº 11.213/1999 outright and its own art. 1º did
 * not carry the transfer clause forward, leaving 2004 without one until Lei SC nº 13.408/2005
 * reinstated it.
 */
const SC_ALEXANDRIA_TRANSFER_GAP_YEAR = 2004;

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
 * Only one of these is a feriado civil under art. 1º, II of Lei 9.093/1995, which authorizes
 * "a data magna do Estado fixada em lei estadual", in the singular. The remaining entries rest
 * on ordinary state laws (and, for a few states, on the state constitution) that declare further
 * feriados estaduais; the library reports them because they are observed in practice, not
 * because art. 1º, II covers them.
 *
 * The statutory date is what is emitted. Four states shift the observed date and only Santa
 * Catarina's shift is modelled here (`nextSundayWhenWeekday`, from
 * `SC_ALEXANDRIA_TRANSFER_SINCE_YEAR` on for 25 November, apart from the
 * `SC_ALEXANDRIA_TRANSFER_GAP_YEAR` gap, and from `SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR` on for
 * 11 August): Acre moves feriados falling from
 * Tuesday to Thursday on to the following Friday (Lei AC nº 2.126, de 19/06/2009, except the
 * Aniversário do Acre on 15/06 and the Revolução Acreana on 06/08, a date this table has no entry
 * for because no state law declaring it a feriado was located), and the
 * Goiás executive may move 26/07 and 28/10 to a nearby dia útil by decree (Lei GO nº 20.756/2020,
 * art. 269, § 1º), neither of which can be resolved from a year alone; São Paulo moved 09/07 to
 * 25/05 for 2020 alone (Lei SP nº 17.264/2020), a one-off this table does not carry.
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
 * @see Official: https://legis.ac.gov.br/detalhar/6247
 * Lei AC nº 2.126, de 19/06/2009, the Friday transfer of the Acre feriados that fall from Tuesday
 * to Thursday, with the Aniversário do Acre (15/06) and the Revolução Acreana (06/08) as its
 * exceptions; not modelled, as said above.
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
 * @see Official: https://sapl.al.al.leg.br/norma/3117
 * Lei AL nº 9.358, de 26/08/2024, Emancipação Política de Alagoas (16/09): "DISPÕE SOBRE O FERIADO
 * ESTADUAL DA EMANCIPAÇÃO POLÍTICA DO ESTADO DE ALAGOAS - DIA 16 DE SETEMBRO". Until 2023 the date
 * was only a ponto facultativo of the state's annual calendar decrees; the optional entry starts in
 * 2020, the year of the one decree cited, Decreto AL nº 68.782, de 30/12/2019, which "dispõe
 * sobre os feriados nacionais e estaduais para o exercício de 2020, define os pontos facultativos".
 * The earlier annual decrees were not located.
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=17488
 * Lei AP nº 667, de 16/04/2002, art. 1º par. único, Dia de São José (19/03), listed from 2003
 * @see Official: https://silegis.al.ap.leg.br/proposicaopdf/2CEatualizadaeconsolidadaateEC071comSumario.pdf
 * Constituição Estadual do AP, de 20/12/1991, art. 355, Criação do Território Federal do Amapá
 * (13/09), listed from 1992: "O dia 13 de Setembro, data magna do Amapá, é feriado em todo o
 * território do Estado".
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=22214
 * Lei AP nº 1.169/2007, Dia Estadual da Consciência Negra (state holiday until it became national
 * in 2024)
 * @see Official: https://sapl.al.am.leg.br/norma/8919
 * Lei AM nº 25, de 21/12/1977, Elevação do Amazonas à categoria de Província (05/09), listed
 * from 1978
 * @see Official: https://sapl.al.am.leg.br/norma/2873
 * Lei AM nº 84/2010, Dia da Consciência Negra (state holiday until it became national in 2024).
 * Its ementa carries the same wording as the Mato Grosso and Rio de Janeiro laws: "INSTITUI no
 * Calendário Oficial do Estado do Amazonas o dia 20 de novembro, data de aniversário da morte de
 * Zumbi dos Palmares e Dia Nacional da Consciência Negra, como feriado estadual".
 * @see Official: https://sapl.cmm.am.gov.br/norma/3932
 * Lei Municipal de Manaus nº 496/1999, Nossa Senhora da Conceição (08/12): "INSTITUI feriado
 * religioso no Município de Manaus no dia 8 de dezembro". No state norm declaring 08/12 was
 * located in the ALEAM records, so the entry is reported as an optional day, not as a feriado
 * estadual.
 * @see Official: https://www.legislabahia.ba.gov.br/documentos/constituicao-do-estado-da-bahia-de-05-de-outubro-de-1989
 * Constituição Estadual da BA, de 05/10/1989, art. 6º § 3º, Independência da Bahia (02/07),
 * listed from 1990: "O Dois de Julho, data magna da Bahia ..., é feriado em todo o território do
 * Estado". The date is older as a holiday than that text, but no earlier state norm declaring it
 * was located.
 * @see Official: https://belt.al.ce.gov.br/index.php/constituicao-do-ceara/emendas-a-constituicao-do-ceara/item/5643-emenda-constitucional-n-73-de-1-de-dezembro-de-2011-d-o-06-12-11
 * Constituição Estadual do CE, art. 18 par. único (EC nº 73, de 01/12/2011, DO 06/12/2011),
 * Abolição da Escravidão no Ceará (25/03), listed from 2012: the text fixes the data magna, and
 * the feriado follows from Lei 9.093/1995, art. 1º, II.
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html
 * Lei distrital nº 72, de 27/12/1989, listed from 1990: art. 1º, I, Fundação de Brasília (21/04),
 * and art. 1º par. único,
 * Corpus Christi: "São, igualmente feriados, a Sexta-feira da Paixão e Corpus Christi, datas
 * móveis".
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/48922/Lei_963_1995.html
 * Lei distrital nº 963, de 04/12/1995, Dia do Evangélico (30/11), listed from 1996
 * @see Official: https://www3.al.es.gov.br/Arquivo/Documents/legislacao/html/LEI110102019.html
 * Lei ES nº 11.010, de 03/07/2019 (DOE 04/07/2019), art. 1º par. único, Nossa Senhora da Penha
 * (padroeira do estado, "sempre na segunda-feira, oitavo dia posterior ao domingo de Páscoa"),
 * listed from 2020, the first of those Mondays after the law
 * @see Official: https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756
 * Lei GO nº 20.756/2020, art. 269, II, the three feriados estaduais of Goiás: "a) 26 de julho,
 * consagrado à fundação da cidade de Goiás; b) 24 de outubro, comemorativo ao lançamento da pedra
 * fundamental de Goiânia; c) 28 de outubro, consagrado ao servidor público". The law is of
 * 28/01/2020 and entered into force on 28/07/2020, after that year's 26 July, so 26/07 is listed
 * from 2021.
 * @see Official: https://legisla.casacivil.go.gov.br/pesquisa_legislacao/83678/lei-10460
 * Lei GO nº 10.460, de 22/02/1988, the servants' statute Lei GO nº 20.756/2020 replaced, which
 * already declared 24/10 and 28/10, so both are listed from 1988. Whether it also carried 26/07
 * could not be confirmed, so that date starts with Lei GO nº 20.756/2020.
 * @see Official: https://arquivos.al.ma.leg.br:8443/ged/legislacao/LEI_2457
 * Lei MA nº 2.457, de 02/10/1964, Adesão do Maranhão à Independência (28/07), listed from 1965:
 * "É feriado estadual o dia 28 de julho, data magna do Estado"
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
 * o 26 de julho, em homenagem a memória do ex-Presidente João Pessoa"; its 5 August, under that
 * other name, is not carried before 2016.
 * @see Official: https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=134573
 * Lei PR nº 18.384/2014, Emancipação Política do Paraná (19/12), expressly "não se constituindo em
 * feriado civil"
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?tiponorma=1&numero=16241&complemento=0&ano=2017&tipo=&url=
 * Lei PE nº 16.241, de 14/12/2017, art. 49, Revolução Pernambucana (06/03), listed from 2018: "Dia 6 de março: Data Magna do
 * Estado de Pernambuco e feriado civil no âmbito do Estado de Pernambuco". Revoked the Lei PE nº
 * 16.059, de 08/06/2017, cited here before, which had itself superseded the movable "primeiro
 * domingo de março" of Lei PE nº 13.835/2009, always a Sunday.
 * @see Official: https://sapl.al.pi.leg.br/norma/5849
 * Lei PI nº 176, de 30/08/1937, Dia do Piauí (19/10), listed from 1937: "19 de Outubro será
 * feriado estadual, com a denominação de DIA DO PIAUHY"
 * @see Official: http://alerjln1.alerj.rj.gov.br/contlei.nsf/f25edae7e64db53b032564fe005262ef/063f7c027766eab48325744a007a4ab0?OpenDocument
 * Lei RJ nº 5.243, de 14/05/2008, art. 1º, which "Institui, no âmbito do Estado do Rio de Janeiro,
 * a terça-feira de carnaval como Feriado Estadual", in force on its publication. That year's
 * Carnaval (5 February 2008) had already passed, so the entry is listed from 2009, under the name
 * of the national Carnaval Tuesday it replaces. The STF ADI 4131 against it was não conhecida
 * (cited below), so the law stands. The Monday stays a ponto facultativo in the state.
 * @see Official: http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/c8aa0900025feef6032564ec0060dfff/1baf90ca125ff96f8325740a00776600
 * Lei RJ nº 5.198, de 05/03/2008, São Jorge (23/04), listed from 2008: the ALERJ text of the law. Its Ficha Técnica records
 * no ação de inconstitucionalidade; the STF case is cited separately below.
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
 * @see Official: https://sapl.al.ro.leg.br/norma/4958
 * Lei RO nº 2.291, de 22/04/2010, Criação do Estado de Rondônia (04/01), listed from 2011: "DECLARA
 * O DIA 4 DE JANEIRO DATA MAGNA E FERIADO CIVIL ESTADUAL". Lei RO nº 3.170/2013, cited here before, is a
 * supplementary credit law: "AUTORIZA O PODER EXECUTIVO A ABRIR CRÉDITO SUPLEMENTAR POR ANULAÇÃO
 * ... EM FAVOR DAS UNIDADES ORÇAMENTÁRIAS: DEPARTAMENTO DE ESTRADAS E RODAGEM - DER/RO,
 * SECRETARIA DE ESTADO DE ASSISTÊNCIA SOCIAL - SEAS", nothing to do with holidays.
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
 * and the same clause for 25 de novembro.
 * @see Official: http://leis.alesc.sc.gov.br/html/1996/10306_1996_lei.html
 * Lei SC nº 10.306, of December 1996, which made 25 November the data magna after that year's
 * date, so it is listed from 1997, and whose art. 1º reads, in the wording of Lei SC nº
 * 12.906/2004 that added 11 August from 2004 on: "É considerada data
 * magna do Estado o dia 11 de agosto, Dia do Estado de Santa Catarina, e dia de Santa Catarina de
 * Alexandria, dia 25 de novembro".
 * @see Official: http://leis.alesc.sc.gov.br/html/1999/11213_1999_lei.html
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
 * without restating the transfer clause. It entered into force on the day it was published (DO
 * 17.320, de 22/01/2004), before that year's 25 November, so 2004 is the one year in which neither
 * date is transferred.
 * @see Official: http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html
 * Lei SC nº 13.408, de 15/07/2005, which reinstated the parágrafo único, this time transferring
 * both dates to the following Sunday, and, by its art. 2º, entered into force on the day it was
 * published (DO 17.680, de 15/07/2005): "Sempre que o dia 11 de agosto e o dia 25 de novembro
 * coincidirem com dias úteis da semana, os feriados e os eventos alusivos às datas serão
 * transferidos para o domingo subseqüente". Both of that year's dates fall after it. The two
 * holidays are therefore split by year: 11 August is fixed in 2004, its first year, and
 * transferring from 2005 on, while 25 November is fixed from 1997 to 1998, transferring from 1999
 * to 2003, fixed again in 2004 and transferring from 2005 on. Lei SC nº 16.719/2015, cited here before, was revoked by Lei SC nº
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
 * Constituição Estadual de SE, art. 269 (EC nº 20, de 31/05/2000), Independência de Sergipe
 * (08/07), listed from 2000: "Será
 * feriado estadual o dia 08 de julho, data consagrada à Independência de Sergipe".
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
		{
			name: "Emancipação Política de Alagoas",
			day: 16,
			month: 9,
			type: "optional",
			since: 2020,
			until: AL_EMANCIPACAO_FERIADO_SINCE_YEAR,
		},
		{
			name: "Emancipação Política de Alagoas",
			day: 16,
			month: 9,
			since: AL_EMANCIPACAO_FERIADO_SINCE_YEAR,
		},
	],
	AP: [
		{ name: "Dia de São José", day: 19, month: 3, since: 2003 },
		{ name: "Criação do Território Federal do Amapá", day: 13, month: 9, since: 1992 },
		{
			name: "Dia Estadual da Consciência Negra",
			day: 20,
			month: 11,
			since: 2007,
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
		{ name: "Nossa Senhora da Conceição", day: 8, month: 12, type: "optional" },
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
		{ name: "Fundação da Cidade de Goiás", day: 26, month: 7, since: 2021 },
		{ name: "Lançamento da Pedra Fundamental de Goiânia", day: 24, month: 10, since: 1988 },
		{ name: "Dia do Servidor Público", day: 28, month: 10, since: 1988 },
	],
	MA: [{ name: "Adesão do Maranhão à Independência", day: 28, month: 7, since: 1965 }],
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
			since: PB_MORTE_JOAO_PESSOA_UNTIL_YEAR,
		},
		{
			name: "Morte de João Pessoa",
			day: 26,
			month: 7,
			since: 1968,
			until: PB_MORTE_JOAO_PESSOA_UNTIL_YEAR,
		},
	],
	PR: [{ name: "Emancipação Política do Paraná", day: 19, month: 12, type: "optional" }],
	PE: [{ name: "Revolução Pernambucana", day: 6, month: 3, since: 2018 }],
	PI: [{ name: "Dia do Piauí", day: 19, month: 10, since: 1937 }],
	RJ: [
		{ name: "Carnaval (terça-feira)", easterOffset: -47, since: 2009 },
		{ name: "São Jorge", day: 23, month: 4, since: 2008 },
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
	RO: [{ name: "Criação do Estado de Rondônia", day: 4, month: 1, since: 2011 }],
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
			nextSundayWhenWeekday: true,
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
			nextSundayWhenWeekday: true,
			since: SC_ALEXANDRIA_TRANSFER_SINCE_YEAR,
			until: SC_ALEXANDRIA_TRANSFER_GAP_YEAR,
		},
		{
			name: "Dia de Santa Catarina de Alexandria",
			day: 25,
			month: 11,
			since: SC_ALEXANDRIA_TRANSFER_GAP_YEAR,
			until: SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR,
		},
		{
			name: "Dia de Santa Catarina de Alexandria",
			day: 25,
			month: 11,
			nextSundayWhenWeekday: true,
			since: SC_NEXT_SUNDAY_TRANSFER_SINCE_YEAR,
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
	SE: [{ name: "Independência de Sergipe", day: 8, month: 7, since: 2000 }],
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
