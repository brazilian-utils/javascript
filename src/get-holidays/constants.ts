import { type StateCode } from "../_internals/constants/states";
import { type HolidayType } from "./get-holidays";

export type StateHolidayEntry = {
	name: string;
	day?: number;
	month?: number;
	easterOffset?: number;
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

export const CONSCIENCIA_NEGRA_HOLIDAY_NAME = "Dia da Consciência Negra";

export const LEGACY_CONSCIENCIA_NEGRA_HOLIDAY_NAME = "Consciência Negra";

/**
 * Feriados estaduais por lei estadual, um por UF (uma UF pode ter mais de um `@see`).
 *
 * @see https://pt.wikipedia.org/wiki/Acre Lei AC nº 1.538/2004, Dia do Evangélico
 * @see https://pt.wikipedia.org/wiki/Acre Lei AC nº 1.411/2001, Dia Internacional da Mulher
 * @see https://pt.wikipedia.org/wiki/Acre Lei AC nº 14/1964, Aniversário do Acre
 * @see https://pt.wikipedia.org/wiki/Acre Lei AC nº 1.526/2004, Dia da Amazônia
 * @see https://pt.wikipedia.org/wiki/Acre Lei AC nº 57/1965, Assinatura do Tratado de Petrópolis
 * @see https://pt.wikipedia.org/wiki/Alagoas Lei AL nº 5.508/1993, São João
 * @see https://pt.wikipedia.org/wiki/Alagoas Lei AL nº 5.509/1993, São Pedro
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Decreto AL nº 68.782/2019 (ponto facultativo), Emancipação Política de Alagoas
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei AP nº 667/2002, Dia de São José
 * @see https://pt.wikipedia.org/wiki/Amap%C3%A1 Constituição Estadual do AP, Criação do Território Federal do Amapá
 * @see https://pt.wikipedia.org/wiki/Dia_Nacional_de_Zumbi_e_da_Consci%C3%AAncia_Negra Lei AP nº 1.169/2007, Dia Estadual da Consciência Negra (state holiday until it became national in 2024)
 * @see https://sapl.al.am.leg.br/norma/8919 Lei AM nº 25/1977, Elevação do Amazonas à categoria de Província (05/09)
 * @see https://sapl.al.am.leg.br/norma/2873 Lei AM nº 84/2010, Dia da Consciência Negra (state holiday until it became national in 2024)
 * @see https://www.legisweb.com.br/legislacao/?id=316229 Decreto AM de 02/02/2016 (calendário oficial), Nossa Senhora da Conceição (08/12): ponto facultativo estadual; feriado apenas no Município de Manaus (Lei Municipal nº 496/1999)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Constituição Estadual da BA, Independência da Bahia
 * @see https://pt.wikipedia.org/wiki/Cear%C3%A1 Constituição Estadual do CE (Data Magna), Abolição da Escravidão no Ceará
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei Distrital nº 963/1995, Dia do Evangélico (DF)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Fundação de Brasília (21/4, Lei Orgânica do DF)
 * @see https://pt.wikipedia.org/wiki/Esp%C3%ADrito_Santo_(estado) Lei ES nº 11.010/2019, Nossa Senhora da Penha (padroeira do estado, 8º dia após a Páscoa)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei MA nº 2.457/1964, Adesão do Maranhão à Independência
 * @see https://pt.wikipedia.org/wiki/Mato_Grosso Lei MT nº 1.587/2002, Dia da Consciência Negra (state holiday until it became national in 2024)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei MS nº 10/1979, Criação do Estado de Mato Grosso do Sul
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei PA nº 5.999/1996, Adesão do Pará à Independência
 * @see https://pt.wikipedia.org/wiki/Para%C3%ADba Lei PB nº 10.601/2015, Fundação do Estado e Dia de Nossa Senhora das Neves
 * @see https://pt.wikipedia.org/wiki/Para%C3%ADba Lei PB nº 3.489/1967, art. 2º, Morte de João Pessoa
 * @see https://pt.wikipedia.org/wiki/Paran%C3%A1 Lei PR nº 18.384/2014 (ponto facultativo), Emancipação Política do Paraná
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei PE nº 13.835/2009, Revolução Pernambucana
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei PI nº 176/1937, Dia do Piauí
 * @see http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/c8aa0900025feef6032564ec0060dfff/1baf90ca125ff96f8325740a00776600 Lei RJ nº 5.198/2008, São Jorge
 * @see http://alerjln1.alerj.rj.gov.br/CONTLEI.NSF/69d90307244602bb032567e800668618/80a541c3a5a9d63183256c7d0057bf25 Lei RJ nº 4.007/2002, Dia da Consciência Negra (state holiday until it became national in 2024; ADI 4.131 pending at the STF)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei RN nº 8.913/2006, Mártires de Cunhaú e Uruaçu
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Constituição Estadual do RS, Revolução Farroupilha
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei RO nº 3.170/2013, Criação do Estado de Rondônia
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Constituição Estadual de RR, Criação do Estado de Roraima
 * @see https://pt.wikipedia.org/wiki/Santa_Catarina Lei SC nº 16.719/2015 (consolida e revoga as Leis nº 10.306/1996 e 12.906/2004), Criação da Capitania de Santa Catarina
 * @see https://pt.wikipedia.org/wiki/Santa_Catarina Lei SC nº 16.719/2015, Dia de Santa Catarina de Alexandria
 * @see https://www.al.sp.gov.br/documentacao/estudos-e-manuais/feriado-9-julho/artigo.htm Lei SP nº 9.497/1997 (PL 710/1995), Revolução Constitucionalista
 * @see https://www.al.sp.gov.br/repositorio/legislacao/lei/2023/lei-17746-12.09.2023.html Lei SP nº 17.746/2023, Dia da Consciência Negra (state holiday in 2023, national since 2024)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Constituição Estadual de SE, Emancipação Política de Sergipe
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei TO nº 960/1998, Autonomia do Estado do Tocantins
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei TO nº 627/1993, Padroeira do Estado (Nossa Senhora da Natividade)
 * @see https://pt.wikipedia.org/wiki/Feriados_no_Brasil Lei TO nº 98/1989, Criação do Estado do Tocantins
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
		{ name: "Emancipação Política de Alagoas", day: 16, month: 9, type: "optional" },
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
		{ name: "Dia do Evangélico", day: 30, month: 11 },
	],
	ES: [{ name: "Nossa Senhora da Penha", easterOffset: 8 }],
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
		{
			name: "Fundação do Estado e Dia de Nossa Senhora das Neves",
			day: 5,
			month: 8,
		},
		{ name: "Morte de João Pessoa", day: 26, month: 7 },
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
		{ name: "Criação da Capitania de Santa Catarina", day: 11, month: 8 },
		{ name: "Dia de Santa Catarina de Alexandria", day: 25, month: 11 },
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
	SE: [{ name: "Emancipação Política de Sergipe", day: 8, month: 7 }],
	TO: [
		{ name: "Autonomia do Estado do Tocantins", day: 18, month: 3 },
		{
			name: "Padroeira do Estado (Nossa Senhora da Natividade)",
			day: 8,
			month: 9,
		},
		{ name: "Criação do Estado do Tocantins", day: 5, month: 10 },
	],
};
