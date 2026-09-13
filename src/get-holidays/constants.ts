import { type StateCode } from "../_internals/constants/states";
import { type HolidayType } from "./get-holidays";

export type StateHolidayEntry = {
	name: string;
	day?: number;
	month?: number;
	easterOffset?: number;
	nextSundayWhenWeekday?: boolean;
	type?: HolidayType;
	since?: number;
	until?: number;
};

export const FIXED_HOLIDAYS = {
	"Ano novo": { day: 1, month: 1 },
	Tiradentes: { day: 21, month: 4 },
	"Dia do trabalhador": { day: 1, month: 5 },
	"Independência do Brasil": { day: 7, month: 9 },
	"Nossa Senhora Aparecida": { day: 12, month: 10 },
	Finados: { day: 2, month: 11 },
	"Proclamação da República": { day: 15, month: 11 },
	Natal: { day: 25, month: 12 },
} as const;

export const CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR = 2024;

/**
 * Lei 14.759/2023 names the holiday "Dia Nacional de Zumbi e da Consciência Negra"; the shorter
 * form below is the one 2.3.0 emitted and is kept so the output does not change.
 */
export const CONSCIENCIA_NEGRA_HOLIDAY_NAME = "Dia da Consciência Negra";

export const LEGACY_CONSCIENCIA_NEGRA_HOLIDAY_NAME = "Consciência Negra";

/** First year Alagoas' 16 September is a feriado estadual, not a ponto facultativo (Lei AL nº 9.358/2024). */
export const AL_EMANCIPACAO_FERIADO_SINCE_YEAR = 2024;

/** First year Paraíba's 26 July is no longer a holiday: Lei PB nº 10.601/2015 revoked its basis on 17/12/2015. */
export const PB_MORTE_JOAO_PESSOA_UNTIL_YEAR = 2016;

/** First year Tocantins' 18 March is no longer a holiday: Lei TO nº 2.013/2009 repealed the feriado clause on 18/02/2009. */
export const TO_AUTONOMIA_UNTIL_YEAR = 2009;

/**
 * Feriados estaduais, um `@see` por entrada.
 *
 * Only one of these is a feriado civil under art. 1º, II of Lei 9.093/1995, which authorizes
 * "a data magna do Estado fixada em lei estadual", in the singular. The remaining entries rest
 * on ordinary state laws (and, for a few states, on the state constitution) that declare further
 * feriados estaduais; the library reports them because they are observed in practice, not
 * because art. 1º, II covers them.
 *
 * The statutory date is what is emitted. Three states shift the observed date and only Santa
 * Catarina's shift is modelled here (`nextSundayWhenWeekday`): Acre moves feriados falling from
 * Tuesday to Thursday on to the following Friday (Lei AC nº 2.126/2009, except 15/06), and the
 * Goiás executive may move 26/07 and 28/10 to a nearby dia útil by decree (Lei GO nº 20.756/2020,
 * art. 269, § 1º), neither of which can be resolved from a year alone.
 *
 * @see Official: https://legis.ac.gov.br/detalhar/1087
 * Lei AC nº 1.538/2004, Dia do Evangélico (23/01)
 * @see Official: https://legis.ac.gov.br/detalhar/1828
 * Lei AC nº 1.411/2001, Dia Internacional da Mulher (08/03)
 * @see Official: https://legis.ac.gov.br/detalhar/618
 * Lei AC nº 14/1964, Aniversário do Acre (15/06)
 * @see Official: https://legis.ac.gov.br/detalhar/940
 * Lei AC nº 243/1968, art. 2º, Dia da Amazônia (05/09): "É considerado feriado estadual o dia 5 de
 * setembro em homenagem ao DIA DA AMAZÔNIA". Lei AC nº 1.526/2004, cited here before, only adds
 * the date to the calendário oficial de eventos.
 * @see Official: https://legis.ac.gov.br/detalhar/688
 * Lei AC nº 57/1965, Assinatura do Tratado de Petrópolis (17/11)
 * @see Official: https://sapl.al.al.leg.br/norma/3363
 * Lei AL nº 5.508/1993, São João (24/06)
 * @see Official: https://sapl.al.al.leg.br/norma/3364
 * Lei AL nº 5.509/1993, São Pedro (29/06)
 * @see Official: https://sapl.al.al.leg.br/norma/3117
 * Lei AL nº 9.358, de 26/08/2024, Emancipação Política de Alagoas (16/09): "DISPÕE SOBRE O FERIADO
 * ESTADUAL DA EMANCIPAÇÃO POLÍTICA DO ESTADO DE ALAGOAS - DIA 16 DE SETEMBRO". Until 2023 the date
 * was only the ponto facultativo of the Decreto AL nº 68.782/2019.
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=17488
 * Lei AP nº 667/2002, art. 1º par. único, Dia de São José (19/03)
 * @see Official: https://silegis.al.ap.leg.br/proposicaopdf/2CEatualizadaeconsolidadaateEC071comSumario.pdf
 * Constituição Estadual do AP, art. 355, Criação do Território Federal do Amapá (13/09): "O dia 13
 * de Setembro, data magna do Amapá, é feriado em todo o território do Estado".
 * @see Official: https://al.ap.leg.br/ver_texto_lei.php?iddocumento=22214
 * Lei AP nº 1.169/2007, Dia Estadual da Consciência Negra (state holiday until it became national
 * in 2024)
 * @see Official: https://sapl.al.am.leg.br/norma/8919
 * Lei AM nº 25/1977, Elevação do Amazonas à categoria de Província (05/09)
 * @see Official: https://sapl.al.am.leg.br/norma/2873
 * Lei AM nº 84/2010, Dia da Consciência Negra (state holiday until it became national in 2024)
 * @see Official: https://sapl.cmm.am.gov.br/norma/3932
 * Lei Municipal de Manaus nº 496/1999, Nossa Senhora da Conceição (08/12): "INSTITUI feriado
 * religioso no Município de Manaus no dia 8 de dezembro". No state norm declaring 08/12 was
 * located in the ALEAM records, so the entry is reported as an optional day, not as a feriado
 * estadual.
 * @see Official: https://www.legislabahia.ba.gov.br/documentos/constituicao-do-estado-da-bahia-de-05-de-outubro-de-1989
 * Constituição Estadual da BA, art. 6º § 3º, Independência da Bahia (02/07): "O Dois de Julho,
 * data magna da Bahia ..., é feriado em todo o território do Estado".
 * @see Official: https://belt.al.ce.gov.br/index.php/constituicao-do-ceara/emendas-a-constituicao-do-ceara/item/5643-emenda-constitucional-n-73-de-1-de-dezembro-de-2011-d-o-06-12-11
 * Constituição Estadual do CE, art. 18 par. único (EC nº 73/2011), Abolição da Escravidão no Ceará
 * (25/03): the text fixes the data magna, and the feriado follows from Lei 9.093/1995, art. 1º,
 * II.
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html
 * Lei distrital nº 72/1989, art. 1º, I, Fundação de Brasília (21/04), and art. 1º par. único,
 * Corpus Christi: "São, igualmente feriados, a Sexta-feira da Paixão e Corpus Christi, datas
 * móveis".
 * @see Official: https://www.sinj.df.gov.br/sinj/Norma/48922/Lei_963_1995.html
 * Lei distrital nº 963/1995, Dia do Evangélico (30/11)
 * @see Official: https://www3.al.es.gov.br/Arquivo/Documents/legislacao/html/LEI110102019.html
 * Lei ES nº 11.010/2019, art. 1º par. único, Nossa Senhora da Penha (padroeira do estado, "sempre
 * na segunda-feira, oitavo dia posterior ao domingo de Páscoa")
 * @see Official: https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756
 * Lei GO nº 20.756/2020, art. 269, II, the three feriados estaduais of Goiás: "a) 26 de julho,
 * consagrado à fundação da cidade de Goiás; b) 24 de outubro, comemorativo ao lançamento da pedra
 * fundamental de Goiânia; c) 28 de outubro, consagrado ao servidor público".
 * @see Official: https://arquivos.al.ma.leg.br:8443/ged/legislacao/LEI_2457
 * Lei MA nº 2.457/1964, Adesão do Maranhão à Independência (28/07)
 * @see Official: https://www.al.mt.gov.br/norma-juridica/urn:lex:br;mato.grosso:estadual:lei.ordinaria:2002-12-27;7879
 * Lei MT nº 7.879/2002, Dia da Consciência Negra (state holiday until it became national in 2024)
 * @see Official: https://aacpdappls.net.ms.gov.br/appls/legislacao/secoge/govato.nsf/1b758e65922af3e904256b220050342a/a489a293563f506304256e450002e9f8
 * Lei MS nº 10/1979, Criação do Estado de Mato Grosso do Sul (11/10)
 * @see Official: https://bancodeleis.alepa.pa.gov.br/arquivos/lei5999_1996_93239.pdf
 * Lei PA nº 5.999/1996, Adesão do Pará à Independência (15/08)
 * @see Official: https://sapl.al.pb.leg.br/norma/11988
 * Lei PB nº 10.601/2015, Data Magna do Estado da Paraíba (05/08): "INSTITUI COMO FERIADO CIVIL O
 * DIA 05 DE AGOSTO, DATA MAGNA DO ESTADO DA PARAÍBA". Its art. 2º also revoked art. 2º of Lei PB
 * nº 3.489/1967, the basis of the 26/07 Morte de João Pessoa entry, which is therefore emitted
 * only up to 2015.
 * @see Official: https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=134573
 * Lei PR nº 18.384/2014, Emancipação Política do Paraná (19/12), expressly "não se constituindo em
 * feriado civil"
 * @see Official: https://legis.alepe.pe.gov.br/texto.aspx?tiponorma=1&numero=16241&complemento=0&ano=2017&tipo=&url=
 * Lei PE nº 16.241/2017, art. 49, Revolução Pernambucana (06/03): "Dia 6 de março: Data Magna do
 * Estado de Pernambuco e feriado civil no âmbito do Estado de Pernambuco". Revoked the Lei PE nº
 * 16.059/2017 cited here before, which had itself superseded the movable "primeiro domingo de
 * março" of Lei PE nº 13.835/2009.
 * @see Official: https://sapl.al.pi.leg.br/norma/5849
 * Lei PI nº 176/1937, Dia do Piauí (19/10)
 * @see Official: http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/c8aa0900025feef6032564ec0060dfff/1baf90ca125ff96f8325740a00776600
 * Lei RJ nº 5.198/2008, São Jorge (23/04), upheld by STF ADI 4092 (Plenário, sessão virtual de 18
 * a 25/08/2023, trânsito em julgado 28/10/2023): "O Tribunal, por maioria, declarou a
 * constitucionalidade da Lei do Estado do Rio de Janeiro n. 5.198, de 5 de março de 2008".
 * @see Official: http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/69d90307244602bb032567e800668618/80a541c3a5a9d63183256c7d0057bf25
 * Lei RJ nº 4.007/2002, Dia da Consciência Negra (state holiday until it became national in 2024).
 * STF ADI 4131, cited here before as pending against it, in fact challenged Lei RJ nº 5.243/2008
 * and was não conhecida on 21/09/2018 (trânsito em julgado 25/10/2018).
 * @see Official: http://www.al.rn.leg.br/storage/legislacao//arq5064574f632ec.pdf
 * Lei RN nº 8.913/2006, Mártires de Cunhaú e Uruaçu (03/10)
 * @see Official: https://ww2.al.rs.gov.br/dal/Legisla%C3%A7%C3%A3o/Constitui%C3%A7%C3%A3oEstadual/tabid/3683/Default.aspx
 * Constituição Estadual do RS, art. 6º § 1º (EC nº 11/1995, renumbered by EC nº 83/2023),
 * Revolução Farroupilha (20/09): "O dia 20 de setembro é a data magna, sendo considerado feriado
 * no Estado".
 * @see Official: https://sapl.al.ro.leg.br/norma/4958
 * Lei RO nº 2.291, de 22/04/2010, Criação do Estado de Rondônia (04/01): "DECLARA O DIA 4 DE
 * JANEIRO DATA MAGNA E FERIADO CIVIL ESTADUAL". Lei RO nº 3.170/2013, cited here before, is a
 * supplementary credit law unrelated to holidays.
 * @see Official: http://sapl.al.rr.leg.br/media/sapl/public/normajuridica/1991/3912/constituicao_estadual_do_estado_de_roraima.pdf
 * Constituição Estadual de RR, art. 9º, Criação do Estado de Roraima (05/10): "Cinco de outubro,
 * data magna de Roraima, é feriado em todo o território do Estado".
 * @see Official: http://leis.alesc.sc.gov.br/html/2022/18531_2022_lei.html
 * Lei SC nº 18.531/2022, the in-force consolidation, whose Anexo Único carries both Santa Catarina
 * holidays and the Sunday transfer: "Sempre que o dia 11 de agosto coincidir com dia útil da
 * semana, o feriado e os eventos alusivos à data serão transferidos para o domingo subsequente"
 * and the same clause for 25 de novembro.
 * @see Official: http://leis.alesc.sc.gov.br/html/1996/10306_1996_lei.html
 * Lei SC nº 10.306/1996, art. 1º, in the wording of Lei SC nº 12.906/2004: "É considerada data
 * magna do Estado o dia 11 de agosto, Dia do Estado de Santa Catarina, e dia de Santa Catarina de
 * Alexandria, dia 25 de novembro".
 * @see Official: http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html
 * Lei SC nº 13.408/2005, which added the parágrafo único transferring both dates to the following
 * Sunday. Lei SC nº 16.719/2015, cited here before, was revoked by Lei SC nº 17.335/2017, itself
 * consolidated and revoked by Lei SC nº 18.531/2022.
 * @see Official: https://www.al.sp.gov.br/documentacao/estudos-e-manuais/feriado-9-julho/artigo.htm
 * Lei SP nº 9.497/1997 (PL 710/1995), Revolução Constitucionalista (09/07)
 * @see Official: https://www.al.sp.gov.br/repositorio/legislacao/lei/2023/lei-17746-12.09.2023.html
 * Lei SP nº 17.746/2023, Dia da Consciência Negra: a permanent state holiday, listed here only for
 * 2023 because the national holiday of Lei 14.759/2023 takes over from 2024.
 * @see Official: https://aleselegis.al.se.leg.br/Arquivo/Documents/legislacao/html/CE11989.html
 * Constituição Estadual de SE, art. 269 (EC nº 20/2000), Independência de Sergipe (08/07): "Será
 * feriado estadual o dia 08 de julho, data consagrada à Independência de Sergipe".
 * @see Official: https://www.al.to.leg.br/arquivo/15717
 * Lei TO nº 960/1998, whose art. 1º caput only institutes the Dia da Autonomia (18/03); the
 * feriado estadual sat in the parágrafo único.
 * @see Official: https://www.al.to.leg.br/arquivo/15724
 * Lei TO nº 2.013, de 18/02/2009, which replaced that parágrafo único with a purely commemorative
 * provision, so 18/03 is emitted only up to 2008.
 * @see Official: https://www.al.to.leg.br/arquivo/6883
 * Lei TO nº 627/1993, Padroeira do Estado (Nossa Senhora da Natividade, 08/09)
 * @see Official: https://www.al.to.leg.br/arquivo/6358
 * Lei TO nº 98/1989, Criação do Estado do Tocantins (05/10)
 */
export const STATE_HOLIDAYS: Partial<Record<StateCode, StateHolidayEntry[]>> = {
	AC: [
		{ name: "Dia do Evangélico", day: 23, month: 1 },
		{ name: "Dia Internacional da Mulher", day: 8, month: 3 },
		{ name: "Aniversário do Acre", day: 15, month: 6 },
		{ name: "Dia da Amazônia", day: 5, month: 9 },
		{ name: "Assinatura do Tratado de Petrópolis", day: 17, month: 11 },
	],
	AL: [
		{ name: "São João", day: 24, month: 6 },
		{ name: "São Pedro", day: 29, month: 6 },
		{
			name: "Emancipação Política de Alagoas",
			day: 16,
			month: 9,
			type: "optional",
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
		{ name: "Dia de São José", day: 19, month: 3 },
		{ name: "Criação do Território Federal do Amapá", day: 13, month: 9 },
		{
			name: "Dia Estadual da Consciência Negra",
			day: 20,
			month: 11,
			since: 2007,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	AM: [
		{ name: "Elevação do Amazonas à categoria de Província", day: 5, month: 9 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2010,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
		{ name: "Nossa Senhora da Conceição", day: 8, month: 12, type: "optional" },
	],
	BA: [{ name: "Independência da Bahia", day: 2, month: 7 }],
	CE: [{ name: "Abolição da Escravidão no Ceará", day: 25, month: 3 }],
	DF: [
		{ name: "Fundação de Brasília", day: 21, month: 4 },
		{ name: "Corpus Christi", easterOffset: 60 },
		{ name: "Dia do Evangélico", day: 30, month: 11 },
	],
	ES: [{ name: "Nossa Senhora da Penha", easterOffset: 8 }],
	GO: [
		{ name: "Fundação da Cidade de Goiás", day: 26, month: 7 },
		{ name: "Lançamento da Pedra Fundamental de Goiânia", day: 24, month: 10 },
		{ name: "Dia do Servidor Público", day: 28, month: 10 },
	],
	MA: [{ name: "Adesão do Maranhão à Independência", day: 28, month: 7 }],
	MT: [
		{
			name: LEGACY_CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	MS: [{ name: "Criação do Estado de Mato Grosso do Sul", day: 11, month: 10 }],
	PA: [{ name: "Adesão do Pará à Independência", day: 15, month: 8 }],
	PB: [
		{ name: "Data Magna do Estado da Paraíba", day: 5, month: 8 },
		{
			name: "Morte de João Pessoa",
			day: 26,
			month: 7,
			until: PB_MORTE_JOAO_PESSOA_UNTIL_YEAR,
		},
	],
	PR: [{ name: "Emancipação Política do Paraná", day: 19, month: 12, type: "optional" }],
	PE: [{ name: "Revolução Pernambucana", day: 6, month: 3 }],
	PI: [{ name: "Dia do Piauí", day: 19, month: 10 }],
	RJ: [
		{ name: "São Jorge", day: 23, month: 4 },
		{
			name: LEGACY_CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	RN: [{ name: "Mártires de Cunhaú e Uruaçu", day: 3, month: 10 }],
	RS: [{ name: "Revolução Farroupilha", day: 20, month: 9 }],
	RO: [{ name: "Criação do Estado de Rondônia", day: 4, month: 1 }],
	RR: [{ name: "Criação do Estado de Roraima", day: 5, month: 10 }],
	SC: [
		{
			name: "Dia do Estado de Santa Catarina",
			day: 11,
			month: 8,
			nextSundayWhenWeekday: true,
		},
		{
			name: "Dia de Santa Catarina de Alexandria",
			day: 25,
			month: 11,
			nextSundayWhenWeekday: true,
		},
	],
	SP: [
		{ name: "Revolução Constitucionalista", day: 9, month: 7 },
		{
			name: CONSCIENCIA_NEGRA_HOLIDAY_NAME,
			day: 20,
			month: 11,
			since: 2023,
			until: CONSCIENCIA_NEGRA_NATIONAL_SINCE_YEAR,
		},
	],
	SE: [{ name: "Independência de Sergipe", day: 8, month: 7 }],
	TO: [
		{
			name: "Autonomia do Estado do Tocantins",
			day: 18,
			month: 3,
			until: TO_AUTONOMIA_UNTIL_YEAR,
		},
		{
			name: "Padroeira do Estado (Nossa Senhora da Natividade)",
			day: 8,
			month: 9,
		},
		{ name: "Criação do Estado do Tocantins", day: 5, month: 10 },
	],
};
